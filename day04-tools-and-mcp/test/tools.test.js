/**
 * Day 4：自包含学习源码。
 *
 * 这个文件属于 day04-tools-and-mcp，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
import assert from 'node:assert/strict';

import { callRegisteredTool, listMockMcpTools, listTools } from '../src/tool-registry.js';

const tools = listTools();
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(tools.some((tool) => tool.name === 'calculator' && tool.risk === 'read-only'));

const mcpTools = listMockMcpTools();
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(mcpTools[0].source, 'mock-mcp');

const calc = await callRegisteredTool('calculator', { expression: '2+3*4' });
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(calc.ok, true);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(calc.data.value, 14);

const badInput = await callRegisteredTool('calculator', {});
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(badInput.ok, false);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(badInput.error.includes('参数错误'));

const unknown = await callRegisteredTool('missing_tool', {});
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(unknown.ok, false);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(unknown.error.includes('未知工具'));

const blocked = await callRegisteredTool('remote_shell_mock', { command: 'whoami' });
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(blocked.ok, false);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(blocked.blocked, true);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(blocked.risk, 'remote');

const allowedDryRun = await callRegisteredTool('write_file_mock', {
  path: '/tmp/demo.txt',
  content: 'hello',
}, {
  allowRisk: ['read-only', 'local-write'],
});
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(allowedDryRun.ok, true);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(allowedDryRun.data.dryRun, true);

console.log('day04 tests passed');

