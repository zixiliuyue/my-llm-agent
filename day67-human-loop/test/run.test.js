/**
 * Day 67 测试：验证 HITL 暂停、通知、webhook 决策、继续和回滚。
 */
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createDecisionPayload, createHumanLoopWorkflow, runDemo, validateDecisionPayload } from "../src/index.js";

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const workflow = createHumanLoopWorkflow();
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const run = workflow.createRun({ goal: "deploy" });
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const approval = workflow.requestApproval(run.id, { summary: "发布到生产", channel: "webhook" });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(workflow.getRun(run.id).status, "waiting-human");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(workflow.listNotifications().length, 1);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const payload = createDecisionPayload(approval.id, "approved", "owner@example.com");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(validateDecisionPayload(payload).ok, true);
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const decision = workflow.handleWebhookDecision(payload);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(decision.run.status, "resumed");
// 等待异步操作完成：下一行代码依赖这个结果。
assert.throws(() => workflow.handleWebhookDecision(payload), /已处理/);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const run2 = workflow.createRun({ goal: "sql fix" });
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const approval2 = workflow.requestApproval(run2.id, { summary: "执行 SQL" });
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const rejected = workflow.handleWebhookDecision(createDecisionPayload(approval2.id, "rejected", "dba@example.com"));
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(rejected.run.status, "rollback-required");

// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(validateDecisionPayload({ approvalId: "x", decision: "approved", decidedBy: "a", signature: "bad" }).ok, false);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const demo = runDemo();
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.day, 67);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.approved.status, "resumed");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.rejected.status, "rollback-required");

// 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day67 tests passed");
