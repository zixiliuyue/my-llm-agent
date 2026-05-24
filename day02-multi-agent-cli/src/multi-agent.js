import { createOllamaClient } from '../../day01-single-agent-cli/src/ollama-client.js';
import { runTool } from '../../day01-single-agent-cli/src/tools.js';
import { parseCritique, parseFinal, parsePlan } from './handoff-protocol.js';
import { roleMessages } from './roles.js';

function preview(value, max = 240) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export async function runToolRunner(plan, onEvent = () => {}) {
  const observations = [];
  for (const step of plan.steps) {
    onEvent({ role: 'tool-runner', type: 'tool_call', tool: step.tool, id: step.id });
    const result = await runTool(step.tool, step.input);
    const observation = {
      id: step.id,
      tool: step.tool,
      ok: result.ok,
      result: result.ok ? result.data : undefined,
      error: result.ok ? undefined : result.error,
    };
    observations.push(observation);
    onEvent({ role: 'tool-runner', type: 'observation', preview: preview(observation) });
  }
  return { type: 'tool_result', observations };
}

export async function runMultiAgent({
  question,
  client = createOllamaClient(),
  onEvent = () => {},
} = {}) {
  if (!question || typeof question !== 'string') {
    throw new Error('question 不能为空');
  }

  const plannerRaw = await client.chat(roleMessages('planner', { question }));
  const plan = parsePlan(plannerRaw);
  onEvent({ role: 'planner', type: 'handoff', preview: preview(plan) });

  const toolResult = await runToolRunner(plan, onEvent);

  const criticRaw = await client.chat(roleMessages('critic', { question, plan, toolResult }));
  const critique = parseCritique(criticRaw);
  onEvent({ role: 'critic', type: 'handoff', preview: preview(critique) });

  const writerRaw = await client.chat(roleMessages('writer', {
    question,
    plan,
    toolResult,
    critique,
  }));
  const final = parseFinal(writerRaw);
  onEvent({ role: 'writer', type: 'final', preview: preview(final.answer) });

  return {
    answer: final.answer,
    plan,
    toolResult,
    critique,
  };
}

