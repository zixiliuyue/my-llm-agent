/**
 * Day 54：自包含学习源码。
 *
 * 这个文件属于 day54-mcp-integration-verifier，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证 MCP 验真必须看 initialize 和 tools/list，不能只看 URL 或 health。
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { buildMcpEndpoint, createMockMcpProbe, verifyMcpIntegration } from "../src/index.js";

// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(buildMcpEndpoint("http://127.0.0.1:18000/", "mcp"), "http://127.0.0.1:18000/mcp");

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const ready = verifyMcpIntegration(createMockMcpProbe());
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(ready.status, "mcp-ready");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(ready.evidence.some((item) => item === "tools=2"));

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const wrong = verifyMcpIntegration(createMockMcpProbe({ candidatePath: "/sse" }));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(wrong.status, "wrong-endpoint");

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const unavailable = verifyMcpIntegration(createMockMcpProbe({ http: { rootStatus: 200, healthStatus: 200, sseStatus: 200, mcpStatus: 404 } }));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(unavailable.status, "mcp-http-unavailable");

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const noTools = verifyMcpIntegration(createMockMcpProbe({ protocol: { initializeOk: true, toolsListOk: false, discoveredTools: [], resourcesEmpty: true } }));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(noTools.status, "mcp-tools-list-failed");

// 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day54 tests passed");
