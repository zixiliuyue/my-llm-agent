// 学习目标：验证 MCP 验真必须看 initialize 和 tools/list，不能只看 URL 或 health。
import assert from "node:assert/strict";
import { buildMcpEndpoint, createMockMcpProbe, verifyMcpIntegration } from "../src/index.js";

assert.equal(buildMcpEndpoint("http://127.0.0.1:18000/", "mcp"), "http://127.0.0.1:18000/mcp");

const ready = verifyMcpIntegration(createMockMcpProbe());
assert.equal(ready.status, "mcp-ready");
assert.ok(ready.evidence.some((item) => item === "tools=2"));

const wrong = verifyMcpIntegration(createMockMcpProbe({ candidatePath: "/sse" }));
assert.equal(wrong.status, "wrong-endpoint");

const unavailable = verifyMcpIntegration(createMockMcpProbe({ http: { rootStatus: 200, healthStatus: 200, sseStatus: 200, mcpStatus: 404 } }));
assert.equal(unavailable.status, "mcp-http-unavailable");

const noTools = verifyMcpIntegration(createMockMcpProbe({ protocol: { initializeOk: true, toolsListOk: false, discoveredTools: [], resourcesEmpty: true } }));
assert.equal(noTools.status, "mcp-tools-list-failed");

console.log("day54 tests passed");
