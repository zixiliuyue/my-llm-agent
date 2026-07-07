/**
 * Day 2：自包含学习源码。
 *
 * 这个文件属于 day02-multi-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
/**
 * Day 02：多 Agent 编排入口。
 *
 * 本文件只引用当前 day 内的模块，保证 day02 可以被单独复制、修改和运行。
 */
import { createOllamaClient } from './ollama-client.js';
import { runTool } from './tools.js';
import { parseCritique, parseFinal, parsePlan } from './handoff-protocol.js';
import { roleMessages } from './roles.js';

/** 把较长的对象压缩成适合 stderr 展示的摘要。 */
function preview(value, max = 240) {
  // 序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

/** tool-runner agent：只负责执行 planner 给出的工具步骤，并返回 observation。 */
// 导出异步函数：调用方需要 await 它，因为内部可能读文件、请求接口或等待模型。
export async function runToolRunner(plan, onEvent = () => {}) {
  const observations = [];
  for (const step of plan.steps) {
    // 调用函数：把当前数据交给已有逻辑处理。
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
    // 调用函数：把当前数据交给已有逻辑处理。
    onEvent({ role: 'tool-runner', type: 'observation', preview: preview(observation) });
  }
  return { type: 'tool_result', observations };
}

/** 按 planner -> tool-runner -> critic -> writer 的顺序执行一次多 agent 协作。 */
// 导出异步函数：调用方需要 await 它，因为内部可能读文件、请求接口或等待模型。
export async function runMultiAgent({
  question,
  // 更新状态：这里会改变前面定义的变量或对象字段。
  client = createOllamaClient(),
  // 更新状态：这里会改变前面定义的变量或对象字段。
  onEvent = () => {},
} = {}) {
  if (!question || typeof question !== 'string') {
    throw new Error('question 不能为空');
  }

  const plannerRaw = await client.chat(roleMessages('planner', { question }));
  const plan = parsePlan(plannerRaw);
  // 调用函数：把当前数据交给已有逻辑处理。
  onEvent({ role: 'planner', type: 'handoff', preview: preview(plan) });

  const toolResult = await runToolRunner(plan, onEvent);

  const criticRaw = await client.chat(roleMessages('critic', { question, plan, toolResult }));
  const critique = parseCritique(criticRaw);
  // 调用函数：把当前数据交给已有逻辑处理。
  onEvent({ role: 'critic', type: 'handoff', preview: preview(critique) });

  const writerRaw = await client.chat(roleMessages('writer', {
    question,
    plan,
    toolResult,
    critique,
  }));
  const final = parseFinal(writerRaw);
  // 调用函数：把当前数据交给已有逻辑处理。
  onEvent({ role: 'writer', type: 'final', preview: preview(final.answer) });

  return {
    answer: final.answer,
    plan,
    toolResult,
    critique,
  };
}
