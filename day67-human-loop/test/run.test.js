/**
 * Day 67 测试：验证 HITL 暂停、通知、webhook 决策、继续和回滚。
 */
import assert from "node:assert/strict";
import { createDecisionPayload, createHumanLoopWorkflow, runDemo, validateDecisionPayload } from "../src/index.js";

const workflow = createHumanLoopWorkflow();
const run = workflow.createRun({ goal: "deploy" });
const approval = workflow.requestApproval(run.id, { summary: "发布到生产", channel: "webhook" });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(workflow.getRun(run.id).status, "waiting-human");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(workflow.listNotifications().length, 1);

const payload = createDecisionPayload(approval.id, "approved", "owner@example.com");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(validateDecisionPayload(payload).ok, true);
const decision = workflow.handleWebhookDecision(payload);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(decision.run.status, "resumed");
assert.throws(() => workflow.handleWebhookDecision(payload), /已处理/);

const run2 = workflow.createRun({ goal: "sql fix" });
const approval2 = workflow.requestApproval(run2.id, { summary: "执行 SQL" });
const rejected = workflow.handleWebhookDecision(createDecisionPayload(approval2.id, "rejected", "dba@example.com"));
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(rejected.run.status, "rollback-required");

// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(validateDecisionPayload({ approvalId: "x", decision: "approved", decidedBy: "a", signature: "bad" }).ok, false);

const demo = runDemo();
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.day, 67);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.approved.status, "resumed");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.rejected.status, "rollback-required");

console.log("day67 tests passed");
