/**
 * Day 6：自包含学习源码。
 *
 * 这个文件属于 day06-evaluation-observability，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 教学：读取文件：教学示例从本地 Markdown 或配置里拿数据。
import { readFile } from 'node:fs/promises';
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { dirname, resolve } from 'node:path';
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { fileURLToPath } from 'node:url';
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { performance } from 'node:perf_hooks';

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const __dirname = dirname(fileURLToPath(import.meta.url));
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const PROJECT_ROOT = resolve(__dirname, '..');

/** 从 JSONL 文件读取评测用例。 */
// 教学：导出异步函数：调用方需要 await 它，因为内部可能读文件、请求接口或等待模型。
export async function loadCases(path = resolve(PROJECT_ROOT, 'evals/cases.jsonl')) {
  // 教学：读取文件：教学示例从本地 Markdown 或配置里拿数据。
  const content = await readFile(path, 'utf8');
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

/** 运行不依赖真实模型的 mock agent，供评测流程稳定测试。 */
// 教学：导出异步函数：调用方需要 await 它，因为内部可能读文件、请求接口或等待模型。
export async function runMockAgent(question) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const lower = question.toLowerCase();
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (/计算|[0-9]\s*[+*]/.test(question)) {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return {
      answer: 'mock 计算结果是 14。',
      events: [
        { type: 'model_call', role: 'planner' },
        { type: 'tool_call', tool: 'calculator' },
        { type: 'observation', ok: true },
      ],
    };
  }
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (lower.includes('agent loop')) {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return {
      answer: 'agent loop 是模型、工具和 observation 之间的循环。',
      events: [
        { type: 'model_call', role: 'planner' },
        { type: 'tool_call', tool: 'search_notes' },
        { type: 'observation', ok: true },
      ],
    };
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    answer: 'mock 当前时间来自 current_time 工具。',
    events: [
      { type: 'model_call', role: 'planner' },
      { type: 'tool_call', tool: 'current_time' },
      { type: 'observation', ok: true },
    ],
  };
}

/** 比较单条用例的期望结果和实际输出。 */
// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function evaluateCase(testCase, runResult) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const tools = runResult.events
    .filter((event) => event.type === 'tool_call')
    .map((event) => event.tool);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const passedTool = !testCase.expectedTool || tools.includes(testCase.expectedTool);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const passedText = !testCase.expectedText || runResult.answer.includes(testCase.expectedText);
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    id: testCase.id,
    passed: passedTool && passedText,
    checks: {
      expectedTool: testCase.expectedTool,
      passedTool,
      expectedText: testCase.expectedText,
      passedText,
    },
    answer: runResult.answer,
    events: runResult.events,
  };
}

/** 运行全部评测用例，并输出 trace、统计和失败报告。 */
// 教学：导出异步函数：调用方需要 await 它，因为内部可能读文件、请求接口或等待模型。
export async function runEvaluations({
  cases,
  runner = runMockAgent,
} = {}) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const evalCases = cases || await loadCases();
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const startedAt = performance.now();
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const results = [];
  // 教学：定义变量：这个值后面会被更新，所以使用 let。
  let modelCalls = 0;
  // 教学：定义变量：这个值后面会被更新，所以使用 let。
  let toolCalls = 0;

  // 教学：循环：按顺序处理多条数据或多个步骤。
  for (const testCase of evalCases) {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const caseStartedAt = performance.now();
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const runResult = await runner(testCase.question);
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const result = evaluateCase(testCase, runResult);
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const durationMs = Math.round(performance.now() - caseStartedAt);
    modelCalls += runResult.events.filter((event) => event.type === 'model_call').length;
    toolCalls += runResult.events.filter((event) => event.type === 'tool_call').length;
    results.push({
      ...result,
      durationMs,
      trace: {
        caseId: testCase.id,
        question: testCase.question,
        events: runResult.events,
      },
    });
  }

  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const passed = results.filter((result) => result.passed).length;
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    summary: {
      total: results.length,
      passed,
      failed: results.length - passed,
      durationMs: Math.round(performance.now() - startedAt),
      modelCalls,
      toolCalls,
    },
    results,
  };
}

