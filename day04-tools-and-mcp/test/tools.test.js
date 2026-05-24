import assert from 'node:assert/strict';

import { callRegisteredTool, listMockMcpTools, listTools } from '../src/tool-registry.js';

const tools = listTools();
assert.ok(tools.some((tool) => tool.name === 'calculator' && tool.risk === 'read-only'));

const mcpTools = listMockMcpTools();
assert.equal(mcpTools[0].source, 'mock-mcp');

const calc = await callRegisteredTool('calculator', { expression: '2+3*4' });
assert.equal(calc.ok, true);
assert.equal(calc.data.value, 14);

const badInput = await callRegisteredTool('calculator', {});
assert.equal(badInput.ok, false);
assert.ok(badInput.error.includes('参数错误'));

const unknown = await callRegisteredTool('missing_tool', {});
assert.equal(unknown.ok, false);
assert.ok(unknown.error.includes('未知工具'));

const blocked = await callRegisteredTool('remote_shell_mock', { command: 'whoami' });
assert.equal(blocked.ok, false);
assert.equal(blocked.blocked, true);
assert.equal(blocked.risk, 'remote');

const allowedDryRun = await callRegisteredTool('write_file_mock', {
  path: '/tmp/demo.txt',
  content: 'hello',
}, {
  allowRisk: ['read-only', 'local-write'],
});
assert.equal(allowedDryRun.ok, true);
assert.equal(allowedDryRun.data.dryRun, true);

console.log('day04 tests passed');

