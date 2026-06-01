/**
 * Day 1：自包含学习源码。
 *
 * 这个文件属于 day01-single-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from 'node:assert/strict';

// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { runAgent } from '../src/agent.js';
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { parseAgentResponse, ProtocolError } from '../src/protocol.js';
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { runTool } from '../src/tools.js';

// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function createMockClient(responses) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const queue = [...responses];
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    async chat() {
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

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const searchResult = await runTool('search_notes', { query: 'agent loop' });
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(searchResult.ok, true);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(searchResult.data.matches.length > 0);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const answer = await runAgent({
  question: '计算 (18+24)*3',
  client: createMockClient([
    '{"type":"tool_call","tool":"calculator","input":{"expression":"(18+24)*3"}}',
    '{"type":"final","answer":"结果是 126。"}',
  ]),
});
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(answer, '结果是 126。');

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const recovered = await runAgent({
  question: '现在几点',
  client: createMockClient([
    '不是 JSON',
    '{"type":"final","answer":"已根据协议恢复。"}',
  ]),
});
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(recovered, '已根据协议恢复。');

// 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log('tests passed');
