/**
 * Day 60 测试：验证产品闭环的状态、审批、citation、health 和 metrics。
 */
import assert from "node:assert/strict";
import { createAgentOpsPlatform, runProductDemo } from "../src/index.js";

const platform = createAgentOpsPlatform();
const run = platform.createRun({ goal: "check worker" });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(run.status, "queued");

const citations = platform.searchKnowledge(run.id, "approval evidence");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.ok(citations.length > 0);

const toolCall = platform.requestToolApproval(run.id, {
  toolName: "remote.shell.dryRun",
  command: "systemctl status worker",
  reason: "只读检查",
});
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(platform.getRun(run.id).status, "waiting-approval");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(toolCall.executableByAgent, false);

platform.decideApproval(toolCall.approvalId, { approved: true });
platform.appendEvidence(run.id, { title: "worker ok", source: "mock", content: "active" });
const report = platform.completeRun(run.id);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(report.status, "ready-for-human-review");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(platform.metrics().readyForReview, 1);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(platform.health().ok, true);

const demo = runProductDemo();
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.day, 60);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.selectedRun.status, "ready-for-human-review");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.ok(demo.selectedRun.timeline.length >= 5);

console.log("day60 tests passed");
