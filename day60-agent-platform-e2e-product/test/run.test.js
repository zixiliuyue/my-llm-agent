/**
 * Day 60 测试：验证产品闭环的状态、审批、citation、health 和 metrics。
 */
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createAgentOpsPlatform, runProductDemo } from "../src/index.js";

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const platform = createAgentOpsPlatform();
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const run = platform.createRun({ goal: "check worker" });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(run.status, "queued");

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const citations = platform.searchKnowledge(run.id, "approval evidence");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.ok(citations.length > 0);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
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
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const report = platform.completeRun(run.id);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(report.status, "ready-for-human-review");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(platform.metrics().readyForReview, 1);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(platform.health().ok, true);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const demo = runProductDemo();
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.day, 60);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.selectedRun.status, "ready-for-human-review");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.ok(demo.selectedRun.timeline.length >= 5);

// 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day60 tests passed");
