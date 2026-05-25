// 学习目标：验证事故报告包含证据、时间线、审计和后续动作，并脱敏敏感字段。
import assert from "node:assert/strict";
import { buildActionItems, createIncidentReport, createMockIncidentContext, runDemo } from "../src/index.js";

const context = createMockIncidentContext();
context.diagnosis.evidence.push("token=secret-value");
const report = createIncidentReport(context);

assert.match(report, /## 证据/);
assert.match(report, /## 时间线/);
assert.match(report, /## 审计/);
assert.match(report, /token=<redacted>/);
assert.doesNotMatch(report, /secret-value/);

const actions = buildActionItems(context);
assert.ok(actions.some((item) => item.owner === "backend"));
assert.ok(actions.some((item) => item.action.includes("权限拒绝")));

assert.equal(runDemo().day, 45);

console.log("day45 tests passed");
