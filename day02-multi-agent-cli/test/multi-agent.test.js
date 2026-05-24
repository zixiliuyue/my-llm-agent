// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from 'node:assert/strict';

// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { parseCritique, parseFinal, parsePlan } from '../src/handoff-protocol.js';
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { runMultiAgent, runToolRunner } from '../src/multi-agent.js';

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function createMockClient(responses) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const queue = [...responses];
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    async chat(messages) {
      // 教学：测试断言：如果实际值不符合预期，测试会立即失败。
      assert.ok(Array.isArray(messages));
      // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (queue.length === 0) {
        // 教学：抛出错误：让调用方知道当前流程不能继续。
        throw new Error('mock response queue is empty');
      }
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return queue.shift();
    },
  };
}

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const plan = parsePlan('{"type":"plan","steps":[{"tool":"calculator","input":{"expression":"(18+24)*3"}}]}');
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(plan.steps[0].id, 'step-1');
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(plan.steps[0].tool, 'calculator');

// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.deepEqual(parseCritique('{"type":"critique","ok":true,"issues":[]}'), {
  type: 'critique',
  ok: true,
  issues: [],
});

// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.deepEqual(parseFinal('```json\n{"type":"final","answer":"结果是 126。"}\n```'), {
  type: 'final',
  answer: '结果是 126。',
});

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const toolResult = await runToolRunner(plan);
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(toolResult.observations[0].ok, true);
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(toolResult.observations[0].result.value, 126);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const events = [];
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const result = await runMultiAgent({
  question: '计算 (18+24)*3',
  client: createMockClient([
    '{"type":"plan","steps":[{"id":"calc","tool":"calculator","input":{"expression":"(18+24)*3"},"reason":"需要计算"}]}',
    '{"type":"critique","ok":true,"issues":[]}',
    '{"type":"final","answer":"结果是 126。"}',
  ]),
  onEvent: (event) => events.push(event),
});

// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(result.answer, '结果是 126。');
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(result.plan.steps[0].id, 'calc');
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(result.critique.ok, true);
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(events.some((event) => event.role === 'planner'));
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(events.some((event) => event.role === 'tool-runner' && event.type === 'tool_call'));
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(events.some((event) => event.role === 'writer'));

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log('day02 tests passed');

