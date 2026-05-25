// 学习目标：验证 MCP mock server 的 tools/list 和 tools/call 行为。
import assert from "node:assert/strict";
import { handleJsonRpcRequest, listTools, runDemo } from "../src/index.js";

assert.deepEqual(listTools().map((tool) => tool.name), ["query_prometheus", "search_logs", "read_deploy_history"]);

const list = handleJsonRpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" });
assert.equal(list.result.tools.length, 3);

const call = handleJsonRpcRequest({
  jsonrpc: "2.0",
  id: 2,
  method: "tools/call",
  params: { name: "search_logs", arguments: { keyword: "mongo" } },
});
assert.equal(call.result.content[0].json.source, "mock-logs");

const unknown = handleJsonRpcRequest({
  jsonrpc: "2.0",
  id: 3,
  method: "tools/call",
  params: { name: "delete_cluster", arguments: {} },
});
assert.equal(unknown.error.code, -32602);

assert.equal(runDemo().day, 44);

console.log("day44 tests passed");
