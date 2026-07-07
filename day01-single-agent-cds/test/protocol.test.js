/**
 * Day 1：自包含学习源码。
 *
 * 这个文件属于 day01-single-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
import assert from 'node:assert/strict';

import { runAgent } from '../src/agent.js';
import { parseAgentResponse, ProtocolError } from '../src/protocol.js';
import { runTool } from '../src/tools.js';

function createMockClient(responses) {
  const queue = [...responses];
  return {
    async chat() {
      if (queue.length === 0) {
        throw new Error('mock response queue is empty');
      }
      return queue.shift();
    },
  };
}

// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.deepEqual(parseAgentResponse('{"type":"final","answer":"完成"}'), {
  type: 'final',
  answer: '完成',
});

// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.deepEqual(parseAgentResponse('```json\n{"type":"tool_call","tool":"calculator","input":{"expression":"1+2"}}\n```'), {
  type: 'tool_call',
  tool: 'calculator',
  input: { expression: '1+2' },
});

// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.throws(() => parseAgentResponse('hello'), ProtocolError);

// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.deepEqual(await runTool('calculator', { expression: '(18+24)*3' }), {
  ok: true,
  data: {
    expression: '(18+24)*3',
    value: 126,
  },
});

const searchResult = await runTool('search_notes', { query: 'agent loop' });
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(searchResult.ok, true);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(searchResult.data.matches.length > 0);

const answer = await runAgent({
  question: '计算 (18+24)*3',
  client: createMockClient([
    '{"type":"tool_call","tool":"calculator","input":{"expression":"(18+24)*3"}}',
    '{"type":"final","answer":"结果是 126。"}',
  ]),
});
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(answer, '结果是 126。');

const recovered = await runAgent({
  question: '现在几点',
  client: createMockClient([
    '不是 JSON',
    '{"type":"final","answer":"已根据协议恢复。"}',
  ]),
});
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(recovered, '已根据协议恢复。');

console.log('tests passed');
