/**
 * Day 70 测试：验证 eval compare、Markdown 报告和 CI gate。
 */
import assert from "node:assert/strict";
import { compareEvalReports, createGithubActionsWorkflow, renderMarkdownReport, runCiGate, runDemo } from "../src/index.js";

const passing = compareEvalReports(
  { version: "base", metrics: { passRate: 0.9, toolCallAccuracy: 0.9, groundedness: 0.9, avgLatencyMs: 1000, costUsd: 0.01 } },
  { version: "pr", metrics: { passRate: 0.92, toolCallAccuracy: 0.91, groundedness: 0.9, avgLatencyMs: 1100, costUsd: 0.011 } },
);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(passing.ok, true);

const failing = compareEvalReports(
  { version: "base", metrics: { passRate: 0.95, toolCallAccuracy: 0.95, groundedness: 0.95, avgLatencyMs: 1000, costUsd: 0.01 } },
  { version: "pr", metrics: { passRate: 0.7, toolCallAccuracy: 0.7, groundedness: 0.7, avgLatencyMs: 2000, costUsd: 0.02 } },
);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(failing.ok, false);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.match(renderMarkdownReport(failing), /Gate: FAIL/);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.match(createGithubActionsWorkflow(), /npm run day70:ci/);

const gate = runCiGate();
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(gate.ok, true);
const demo = runDemo();
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.day, 70);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.match(demo.workflow, /pull_request/);

console.log("day70 tests passed");
