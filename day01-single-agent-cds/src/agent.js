/**
 * Day 1：自包含学习源码。
 *
 * 这个文件属于 day01-single-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 读取文件：教学示例从本地 Markdown 或配置里拿数据。
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOllamaClient } from './ollama-client.js';
import { ProtocolError, parseAgentResponse } from './protocol.js';
import { getToolSpecs, runTool } from './tools.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const DEFAULT_MAX_STEPS = 5;

/** 加载系统提示词，并把当天允许使用的工具规格拼进提示词。 */
async function loadSystemPrompt() {
  const promptPath = resolve(PROJECT_ROOT, 'prompts/system.md');
  // 读取文件：教学示例从本地 Markdown 或配置里拿数据。
  const prompt = await readFile(promptPath, 'utf8');
  // const tools = getToolSpecs();
  return [
    prompt.trim(),
    '',
  ].join('\n');
}

/** 把较长的值压缩成日志摘要，避免学习输出被大对象淹没。 */
function preview(value, max = 180) {
  // 序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

/** 把工具执行结果包装成 observation，让模型能进入下一轮判断。 */
function observationMessage(payload) {
  return [
    'OBSERVATION:',
    // 序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
    JSON.stringify(payload, null, 2),
    '',
    '请基于这个观察结果继续。仍然只能输出一个 JSON 对象：tool_call 或 final。',
  ].join('\n');
}

/** 把协议解析错误转成可回填给模型的 observation。 */
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

/** 执行单体 agent loop，直到拿到 final 或超过最大轮数。 */
// 导出异步函数：调用方需要 await 它，因为内部可能读文件、请求接口或等待模型。
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
    let action;
    try {
      action = parseAgentResponse(content);
      console.log('maxSteps ' + JSON.stringify(messages) + ' [step ' + step + '] 解析模型回答: ' + JSON.stringify(action));
      break;
    } catch (error) {
      if (!(error instanceof ProtocolError)) {
        throw error;
      }
      onStep({ type: 'retry', step, message: error.message });
      messages.push({ role: 'assistant', content });
      messages.push({ role: 'user', content: protocolErrorObservation(error) });
      continue;
    }
  }
}
