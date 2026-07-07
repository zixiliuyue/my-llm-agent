/**
 * Day 44：自包含学习源码。
 *
 * 这个文件属于 day44-mcp-observability-server，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证 MCP mock server 的 tools/list 和 tools/call 行为。
import assert from "node:assert/strict";
import { handleJsonRpcRequest, listTools, runDemo } from "../src/index.js";

// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.deepEqual(listTools().map((tool) => tool.name), ["query_prometheus", "search_logs", "read_deploy_history"]);

const list = handleJsonRpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(list.result.tools.length, 3);

const call = handleJsonRpcRequest({
  jsonrpc: "2.0",
  id: 2,
  method: "tools/call",
  params: { name: "search_logs", arguments: { keyword: "mongo" } },
});
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(call.result.content[0].json.source, "mock-logs");

const unknown = handleJsonRpcRequest({
  jsonrpc: "2.0",
  id: 3,
  method: "tools/call",
  params: { name: "delete_cluster", arguments: {} },
});
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(unknown.error.code, -32602);

// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runDemo().day, 44);

console.log("day44 tests passed");
