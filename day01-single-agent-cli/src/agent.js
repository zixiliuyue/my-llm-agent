/**
 * Day 1：自包含学习源码。
 *
 * 这个文件属于 day01-single-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 读取文件：教学示例从本地 Markdown 或配置里拿数据。
import { readFile } from 'node:fs/promises';
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { dirname, resolve } from 'node:path';
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { fileURLToPath } from 'node:url';

// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createOllamaClient } from './ollama-client.js';
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { ProtocolError, parseAgentResponse } from './protocol.js';
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { getToolSpecs, runTool } from './tools.js';

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const __dirname = dirname(fileURLToPath(import.meta.url));
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const PROJECT_ROOT = resolve(__dirname, '..');
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const DEFAULT_MAX_STEPS = 5;

/** 加载系统提示词，并把当天允许使用的工具规格拼进提示词。 */
// 异步函数：里面会 await 异步操作，所以调用时也要等待结果。
async function loadSystemPrompt() {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const promptPath = resolve(PROJECT_ROOT, 'prompts/system.md');
  // 读取文件：教学示例从本地 Markdown 或配置里拿数据。
  const prompt = await readFile(promptPath, 'utf8');
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const tools = getToolSpecs();
  // 返回结果：调用方会拿到这个值继续后续流程。
  return [
    prompt.trim(),
    '',
    '当前可用工具如下，工具名必须精确匹配：',
    // 序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
    JSON.stringify(tools, null, 2),
  ].join('\n');
}

/** 把较长的值压缩成日志摘要，避免学习输出被大对象淹没。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function preview(value, max = 180) {
  // 序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  // 返回结果：调用方会拿到这个值继续后续流程。
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

/** 把工具执行结果包装成 observation，让模型能进入下一轮判断。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function observationMessage(payload) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return [
    'OBSERVATION:',
    // 序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
    JSON.stringify(payload, null, 2),
    '',
    '请基于这个观察结果继续。仍然只能输出一个 JSON 对象：tool_call 或 final。',
  ].join('\n');
}

/** 把协议解析错误转成可回填给模型的 observation。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function protocolErrorObservation(error) {
  // 返回结果：调用方会拿到这个值继续后续流程。
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
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!question || typeof question !== 'string') {
    // 抛出错误：让调用方知道当前流程不能继续。
    throw new Error('question 不能为空');
  }

  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const messages = [
    { role: 'system', content: await loadSystemPrompt() },
    { role: 'user', content: question },
  ];

  // 循环：按顺序处理多条数据或多个步骤。
  for (let step = 1; step <= maxSteps; step += 1) {
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const content = await client.chat(messages);
    console.log(`maxSteps ${messages} [step ${step}] 模型回答: ${content}`);
    onStep({ type: 'model_response', step, preview: preview(content) });

    // 定义变量：这个值后面会被更新，所以使用 let。
    let action;
    // try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
    try {
      action = parseAgentResponse(content);
    } catch (error) {
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (!(error instanceof ProtocolError)) {
        // 抛出错误：让调用方知道当前流程不能继续。
        throw error;
      }
      onStep({ type: 'retry', step, message: error.message });
      messages.push({ role: 'assistant', content });
      messages.push({ role: 'user', content: protocolErrorObservation(error) });
      continue;
    }

    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (action.type === 'final') {
      // 返回结果：调用方会拿到这个值继续后续流程。
      return action.answer;
    }

    onStep({ type: 'tool_call', step, tool: action.tool });
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
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

  // 抛出错误：让调用方知道当前流程不能继续。
  throw new Error(`agent 超过 ${maxSteps} 轮仍未给出 final。可以换更强模型，或把问题拆小。`);
}
