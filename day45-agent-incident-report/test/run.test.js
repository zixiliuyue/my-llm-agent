/**
 * Day 45：自包含学习源码。
 *
 * 这个文件属于 day45-agent-incident-report，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证事故报告包含证据、时间线、审计和后续动作，并脱敏敏感字段。
import assert from "node:assert/strict";
import { buildActionItems, createIncidentReport, createMockIncidentContext, runDemo } from "../src/index.js";

const context = createMockIncidentContext();
context.diagnosis.evidence.push("token=secret-value");
const report = createIncidentReport(context);

// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.match(report, /## 证据/);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.match(report, /## 时间线/);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.match(report, /## 审计/);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.match(report, /token=<redacted>/);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.doesNotMatch(report, /secret-value/);

const actions = buildActionItems(context);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(actions.some((item) => item.owner === "backend"));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(actions.some((item) => item.action.includes("权限拒绝")));

// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runDemo().day, 45);

console.log("day45 tests passed");
