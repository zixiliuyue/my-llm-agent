/**
 * Day 1：自包含学习源码。
 *
 * 这个文件属于 day01-single-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createOllamaClient } from './ollama-client.js';
import { ProtocolError, parseAgentResponse } from './protocol.js';
import { getToolSpecs, runTool } from './tools.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const DEFAULT_MAX_STEPS = 5;

async function loadSystemPrompt() {
  const promptPath = resolve(PROJECT_ROOT, 'prompts/system.md');
  const prompt = await readFile(promptPath, 'utf8');
  const tools = getToolSpecs();
  return [
    prompt.trim(),
    '',
    '当前可用工具如下，工具名必须精确匹配：',
    JSON.stringify(tools, null, 2),
  ].join('\n');
}

function preview(value, max = 180) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function observationMessage(payload) {
  return [
    'OBSERVATION:',
    JSON.stringify(payload, null, 2),
    '',
    '请基于这个观察结果继续。仍然只能输出一个 JSON 对象：tool_call 或 final。',
  ].join('\n');
}

function protocolErrorObservation(error) {
  return observationMessage({
    ok: false,
    error: 'invalid_agent_response',
    message: error.message,
    expected: {
      tool_call: {
        type: 'tool_call',
        tool: 'calculator',
        input: { expression: '(18+24)*3' },
      },
      final: {
        type: 'final',
        answer: '最终回答',
      },
    },
  });
}

export async function runAgent({
  question,
  client = createOllamaClient(),
  maxSteps = DEFAULT_MAX_STEPS,
  onStep = () => {},
} = {}) {
  if (!question || typeof question !== 'string') {
    throw new Error('question 不能为空');
  }

  const messages = [
    { role: 'system', content: await loadSystemPrompt() },
    { role: 'user', content: question },
  ];

  for (let step = 1; step <= maxSteps; step += 1) {
    const content = await client.chat(messages);
    onStep({ type: 'model_response', step, preview: preview(content) });

    let action;
    try {
      action = parseAgentResponse(content);
    } catch (error) {
      if (!(error instanceof ProtocolError)) {
        throw error;
      }
      onStep({ type: 'retry', step, message: error.message });
      messages.push({ role: 'assistant', content });
      messages.push({ role: 'user', content: protocolErrorObservation(error) });
      continue;
    }

    if (action.type === 'final') {
      return action.answer;
    }

    onStep({ type: 'tool_call', step, tool: action.tool });
    const result = await runTool(action.tool, action.input);
    onStep({ type: 'observation', step, preview: preview(result) });

    messages.push({ role: 'assistant', content });
    messages.push({
      role: 'user',
      content: observationMessage({
        ok: result.ok,
        tool: action.tool,
        result: result.ok ? result.data : undefined,
        error: result.ok ? undefined : result.error,
      }),
    });
  }

  throw new Error(`agent 超过 ${maxSteps} 轮仍未给出 final。可以换更强模型，或把问题拆小。`);
}
