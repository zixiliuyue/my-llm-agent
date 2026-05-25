/**
 * Day 44：自包含学习源码。
 *
 * 这个文件属于 day44-mcp-observability-server，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证 MCP mock server 的 tools/list 和 tools/call 行为。
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { handleJsonRpcRequest, listTools, runDemo } from "../src/index.js";

// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.deepEqual(listTools().map((tool) => tool.name), ["query_prometheus", "search_logs", "read_deploy_history"]);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const list = handleJsonRpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" });
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(list.result.tools.length, 3);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const call = handleJsonRpcRequest({
  jsonrpc: "2.0",
  id: 2,
  method: "tools/call",
  params: { name: "search_logs", arguments: { keyword: "mongo" } },
});
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(call.result.content[0].json.source, "mock-logs");

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const unknown = handleJsonRpcRequest({
  jsonrpc: "2.0",
  id: 3,
  method: "tools/call",
  params: { name: "delete_cluster", arguments: {} },
});
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(unknown.error.code, -32602);

// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runDemo().day, 44);

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day44 tests passed");
