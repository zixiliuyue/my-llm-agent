/**
 * Day 5：自包含学习源码。
 *
 * 这个文件属于 day05-vue-web-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from 'node:assert/strict';

// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createAgentHttpServer, runAgentRequest } from '../server/agent-api.js';

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const mockResult = await runAgentRequest({ question: '计算 (18+24)*3', mock: true });
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(mockResult.ok, true);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(mockResult.mock, true);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(mockResult.events.some((event) => event.type === 'tool_call'));
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(mockResult.steps.some((event) => event.type === 'tool_call'));

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const badResult = await runAgentRequest({ question: '', mock: true });
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(badResult.ok, false);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const server = createAgentHttpServer();
// 等待异步操作完成：下一行代码依赖这个结果。
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const { port } = server.address();
// 这里模拟浏览器前端调用 Node 后端的 /api/agent。
// 测试用 mock=true，保证不依赖本地 Ollama 也能验证 HTTP 协议。
// 发起 HTTP 请求：这里会访问本地 API 或 Ollama 服务。
const response = await fetch(`http://127.0.0.1:${port}/api/agent`, {
  // POST 表示提交一个问题给 agent API。
  method: 'POST',
  // 告诉后端请求体是 JSON，readJson 才能正确解析。
  headers: { 'content-type': 'application/json' },
  // question 是用户输入；mock=true 表示只跑假数据流程，不调用真实模型。
  // 序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
  body: JSON.stringify({
    question: '什么是 agent loop',
    mock: true,
  }),
});
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const body = await response.json();
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(response.status, 200);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(body.ok, true);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(body.mock, true);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(Array.isArray(body.steps));
// 等待异步操作完成：下一行代码依赖这个结果。
await new Promise((resolve) => server.close(resolve));

// 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log('day05 tests passed');
