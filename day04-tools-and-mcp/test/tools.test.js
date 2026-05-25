/**
 * Day 4：自包含学习源码。
 *
 * 这个文件属于 day04-tools-and-mcp，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from 'node:assert/strict';

// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { callRegisteredTool, listMockMcpTools, listTools } from '../src/tool-registry.js';

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const tools = listTools();
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(tools.some((tool) => tool.name === 'calculator' && tool.risk === 'read-only'));

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const mcpTools = listMockMcpTools();
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(mcpTools[0].source, 'mock-mcp');

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const calc = await callRegisteredTool('calculator', { expression: '2+3*4' });
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(calc.ok, true);
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(calc.data.value, 14);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const badInput = await callRegisteredTool('calculator', {});
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(badInput.ok, false);
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(badInput.error.includes('参数错误'));

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const unknown = await callRegisteredTool('missing_tool', {});
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(unknown.ok, false);
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(unknown.error.includes('未知工具'));

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const blocked = await callRegisteredTool('remote_shell_mock', { command: 'whoami' });
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(blocked.ok, false);
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(blocked.blocked, true);
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(blocked.risk, 'remote');

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const allowedDryRun = await callRegisteredTool('write_file_mock', {
  path: '/tmp/demo.txt',
  content: 'hello',
}, {
  allowRisk: ['read-only', 'local-write'],
});
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(allowedDryRun.ok, true);
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(allowedDryRun.data.dryRun, true);

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log('day04 tests passed');

