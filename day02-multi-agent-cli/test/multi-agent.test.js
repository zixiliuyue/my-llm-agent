/**
 * Day 2：自包含学习源码。
 *
 * 这个文件属于 day02-multi-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
import assert from 'node:assert/strict';

import { parseCritique, parseFinal, parsePlan } from '../src/handoff-protocol.js';
import { runMultiAgent, runToolRunner } from '../src/multi-agent.js';

// 定义常量：记录当前 day 测试运行所需的最低 Node 主版本和次版本。
const MIN_NODE_MAJOR = 18;
// 定义常量：记录当前 day 测试运行所需的最低 Node 主版本和次版本。
const MIN_NODE_MINOR = 17;

/** 测试入口也先校验 Node 版本，避免旧环境报出与学习内容无关的错误。 */
function ensureSupportedNode() {
  // 解构赋值：把版本字符串按点拆开后取出主版本和次版本。
  const [major = '0', minor = '0'] = process.versions.node.split('.');
  const currentMajor = Number.parseInt(major, 10) || 0;
  const currentMinor = Number.parseInt(minor, 10) || 0;
  if (
    currentMajor > MIN_NODE_MAJOR ||
    (currentMajor === MIN_NODE_MAJOR && currentMinor >= MIN_NODE_MINOR)
  ) {
    return;
  }
  throw new Error(
    `day02 测试需要 Node >= ${MIN_NODE_MAJOR}.${MIN_NODE_MINOR}，当前是 ${process.versions.node}。`,
  );
}

function createMockClient(responses) {
  const queue = [...responses];
  return {
    async chat(messages) {
      // 测试断言：如果实际值不符合预期，测试会立即失败。
      assert.ok(Array.isArray(messages));
      if (queue.length === 0) {
        throw new Error('mock response queue is empty');
      }
      return queue.shift();
    },
  };
}

// 异步 IIFE：避免旧 Node 因顶层 await 直接语法失败。
(async () => {
  ensureSupportedNode();

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

  const toolResult = await runToolRunner(plan);
  // 测试断言：如果实际值不符合预期，测试会立即失败。
  assert.equal(toolResult.observations[0].ok, true);
  // 测试断言：如果实际值不符合预期，测试会立即失败。
  assert.equal(toolResult.observations[0].result.value, 126);

  const events = [];
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

  console.log('day02 tests passed');
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
