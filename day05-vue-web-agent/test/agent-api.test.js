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
const response = await fetch(`http://127.0.0.1:${port}/api/agent`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ question: '什么是 agent loop', mock: true }),
});
const body = await response.json();
assert.equal(response.status, 200);
assert.equal(body.ok, true);
assert.equal(body.mock, true);
assert.ok(Array.isArray(body.steps));
await new Promise((resolve) => server.close(resolve));

console.log('day05 tests passed');
