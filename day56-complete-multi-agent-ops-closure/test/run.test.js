/**
 * Day 56：自包含学习源码。
 *
 * 这个文件属于 day56-complete-multi-agent-ops-closure，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证完整多 Agent 闭环的 happy path、阻断、SQL 边界、MCP 验真和复盘质量。
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import {
  createMockCapstoneInput,
  runCompleteMultiAgentClosure,
  runMcpVerifierAgent,
  runSafetyAgent,
  runSqlAgent,
} from "../src/index.js";

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const expectedKeys = [
  "day",
  "title",
  "localOnly",
  "runId",
  "agents",
  "handoffs",
  "evidenceBoard",
  "decision",
  "finalReport",
  "unresolvedRisks",
];

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const happy = runCompleteMultiAgentClosure(createMockCapstoneInput());
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.deepEqual(Object.keys(happy), expectedKeys);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(happy.day, 56);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(happy.localOnly, true);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(happy.decision.status, "ready-for-human-review");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(happy.finalReport.readyForHumanReview, true);
// 循环：按顺序处理多条数据或多个步骤。
for (const agentId of [
  "coordinator-agent",
  "observability-agent",
  "permission-agent",
  "safety-agent",
  "sql-agent",
  "mcp-verifier-agent",
  "retro-agent",
]) {
  // 测试断言：把预期行为写死，防止后续修改破坏边界。
  assert.ok(happy.agents.some((agent) => agent.id === agentId && agent.status === "completed"));
  // 测试断言：把预期行为写死，防止后续修改破坏边界。
  assert.ok(happy.handoffs.some((item) => item.to === agentId || item.from === agentId));
}

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const permissionFailure = runCompleteMultiAgentClosure(createMockCapstoneInput({
  permission: {
    redisUserPermission: null,
  },
}));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(permissionFailure.decision.status, "blocked-by-permission");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(permissionFailure.agents.find((agent) => agent.id === "permission-agent").status, "blocked");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(permissionFailure.agents.find((agent) => agent.id === "safety-agent").status, "skipped");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(permissionFailure.handoffs.some((item) => item.to === "safety-agent"), false);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const dangerous = runSafetyAgent({
  target: "test-host:36422",
  command: "rm -rf /",
});
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(dangerous.status, "blocked");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(dangerous.reason, "catastrophic-command");
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const dangerousClosure = runCompleteMultiAgentClosure(createMockCapstoneInput({
  safety: {
    command: "rm -rf /",
  },
}));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(dangerousClosure.decision.status, "blocked-by-safety");

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const sql = runSqlAgent(createMockCapstoneInput().sql);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(sql.executableByAgent, false);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.match(sql.sql, /SELECT id, status FROM cc_CfgFileDeployRecord WHERE id IN \(1201, 1202\) FOR UPDATE;/);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.match(sql.rollbackSql, /UPDATE cc_CfgFileDeployRecord SET status = 'stuck'/);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const wrongEndpoint = runMcpVerifierAgent(createMockCapstoneInput({
  mcp: {
    candidatePath: "/health",
    httpStatus: 200,
  },
}).mcp);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(wrongEndpoint.status, "wrong-endpoint");
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const wrongEndpointClosure = runCompleteMultiAgentClosure(createMockCapstoneInput({
  mcp: {
    candidatePath: "/sse",
    httpStatus: 200,
  },
}));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(wrongEndpointClosure.decision.status, "needs-mcp-fix");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(wrongEndpointClosure.finalReport.readyForHumanReview, false);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const badRetro = runCompleteMultiAgentClosure(createMockCapstoneInput({
  retro: {
    prevention: [],
    rawText: "token=secret",
  },
}));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(badRetro.decision.status, "needs-retro-fix");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(badRetro.finalReport.readyForHumanReview, false);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(badRetro.evidenceBoard.retro.checks.find((item) => item.id === "prevention").ok, false);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(badRetro.evidenceBoard.retro.checks.find((item) => item.id === "redaction").ok, false);

// 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day56 tests passed");
