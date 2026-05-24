import assert from 'node:assert/strict';

import { createAgentHttpServer, runAgentRequest } from '../server/agent-api.js';

const mockResult = await runAgentRequest({ question: '计算 (18+24)*3', mock: true });
assert.equal(mockResult.ok, true);
assert.equal(mockResult.mock, true);
assert.ok(mockResult.events.some((event) => event.type === 'tool_call'));
assert.ok(mockResult.steps.some((event) => event.type === 'tool_call'));

const badResult = await runAgentRequest({ question: '', mock: true });
assert.equal(badResult.ok, false);

const server = createAgentHttpServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
// 这里模拟浏览器前端调用 Node 后端的 /api/agent。
// 测试用 mock=true，保证不依赖本地 Ollama 也能验证 HTTP 协议。
const response = await fetch(`http://127.0.0.1:${port}/api/agent`, {
  // POST 表示提交一个问题给 agent API。
  method: 'POST',
  // 告诉后端请求体是 JSON，readJson 才能正确解析。
  headers: { 'content-type': 'application/json' },
  // question 是用户输入；mock=true 表示只跑假数据流程，不调用真实模型。
  body: JSON.stringify({
    question: '什么是 agent loop',
    mock: true,
  }),
});
const body = await response.json();
assert.equal(response.status, 200);
assert.equal(body.ok, true);
assert.equal(body.mock, true);
assert.ok(Array.isArray(body.steps));
await new Promise((resolve) => server.close(resolve));

console.log('day05 tests passed');
