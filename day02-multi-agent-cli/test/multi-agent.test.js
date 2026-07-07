/**
 * Day 2：自包含学习源码。
 *
 * 这个文件属于 day02-multi-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from 'node:assert/strict';

// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { parseCritique, parseFinal, parsePlan } from '../src/handoff-protocol.js';
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { runMultiAgent, runToolRunner } from '../src/multi-agent.js';

// 定义常量：记录当前 day 测试运行所需的最低 Node 主版本和次版本。
const MIN_NODE_MAJOR = 18;
// 定义常量：记录当前 day 测试运行所需的最低 Node 主版本和次版本。
const MIN_NODE_MINOR = 17;

/** 测试入口也先校验 Node 版本，避免旧环境报出与学习内容无关的错误。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function ensureSupportedNode() {
  // 解构赋值：把版本字符串按点拆开后取出主版本和次版本。
  const [major = '0', minor = '0'] = process.versions.node.split('.');
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const currentMajor = Number.parseInt(major, 10) || 0;
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const currentMinor = Number.parseInt(minor, 10) || 0;
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (
    currentMajor > MIN_NODE_MAJOR ||
    (currentMajor === MIN_NODE_MAJOR && currentMinor >= MIN_NODE_MINOR)
  ) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return;
  }
  // 抛出错误：让调用方知道当前流程不能继续。
  throw new Error(
    `day02 测试需要 Node >= ${MIN_NODE_MAJOR}.${MIN_NODE_MINOR}，当前是 ${process.versions.node}。`,
  );
}

// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function createMockClient(responses) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const queue = [...responses];
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    async chat(messages) {
      // 测试断言：如果实际值不符合预期，测试会立即失败。
      assert.ok(Array.isArray(messages));
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (queue.length === 0) {
        // 抛出错误：让调用方知道当前流程不能继续。
        throw new Error('mock response queue is empty');
      }
      // 返回结果：调用方会拿到这个值继续后续流程。
      return queue.shift();
    },
  };
}

// 异步 IIFE：避免旧 Node 因顶层 await 直接语法失败。
(async () => {
  ensureSupportedNode();

  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const plan = parsePlan('{"type":"plan","steps":[{"tool":"calculator","input":{"expression":"(18+24)*3"}}]}');
  // 测试断言：如果实际值不符合预期，测试会立即失败。
  assert.equal(plan.steps[0].id, 'step-1');
  // 测试断言：如果实际值不符合预期，测试会立即失败。
  assert.equal(plan.steps[0].tool, 'calculator');

  // 测试断言：如果实际值不符合预期，测试会立即失败。
  assert.deepEqual(parseCritique('{"type":"critique","ok":true,"issues":[]}'), {
    type: 'critique',
    ok: true,
    issues: [],
  });

  // 测试断言：如果实际值不符合预期，测试会立即失败。
  assert.deepEqual(parseFinal('```json\n{"type":"final","answer":"结果是 126。"}\n```'), {
    type: 'final',
    answer: '结果是 126。',
  });

  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const toolResult = await runToolRunner(plan);
  // 测试断言：如果实际值不符合预期，测试会立即失败。
  assert.equal(toolResult.observations[0].ok, true);
  // 测试断言：如果实际值不符合预期，测试会立即失败。
  assert.equal(toolResult.observations[0].result.value, 126);

  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const events = [];
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const result = await runMultiAgent({
    question: '计算 (18+24)*3',
    client: createMockClient([
      '{"type":"plan","steps":[{"id":"calc","tool":"calculator","input":{"expression":"(18+24)*3"},"reason":"需要计算"}]}',
      '{"type":"critique","ok":true,"issues":[]}',
      '{"type":"final","answer":"结果是 126。"}',
    ]),
    onEvent: (event) => events.push(event),
  });

  // 测试断言：如果实际值不符合预期，测试会立即失败。
  assert.equal(result.answer, '结果是 126。');
  // 测试断言：如果实际值不符合预期，测试会立即失败。
  assert.equal(result.plan.steps[0].id, 'calc');
  // 测试断言：如果实际值不符合预期，测试会立即失败。
  assert.equal(result.critique.ok, true);
  // 测试断言：如果实际值不符合预期，测试会立即失败。
  assert.ok(events.some((event) => event.role === 'planner'));
  // 测试断言：如果实际值不符合预期，测试会立即失败。
  assert.ok(events.some((event) => event.role === 'tool-runner' && event.type === 'tool_call'));
  // 测试断言：如果实际值不符合预期，测试会立即失败。
  assert.ok(events.some((event) => event.role === 'writer'));

  // 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
  console.log('day02 tests passed');
})().catch((error) => {
  // 输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
  console.error(error.message);
  // 退出进程：用退出码告诉 shell 当前命令成功还是失败。
  process.exitCode = 1;
});
