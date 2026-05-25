/**
 * Day 70 测试：验证 eval compare、Markdown 报告和 CI gate。
 */
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { compareEvalReports, createGithubActionsWorkflow, renderMarkdownReport, runCiGate, runDemo } from "../src/index.js";

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const passing = compareEvalReports(
  { version: "base", metrics: { passRate: 0.9, toolCallAccuracy: 0.9, groundedness: 0.9, avgLatencyMs: 1000, costUsd: 0.01 } },
  { version: "pr", metrics: { passRate: 0.92, toolCallAccuracy: 0.91, groundedness: 0.9, avgLatencyMs: 1100, costUsd: 0.011 } },
);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(passing.ok, true);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const failing = compareEvalReports(
  { version: "base", metrics: { passRate: 0.95, toolCallAccuracy: 0.95, groundedness: 0.95, avgLatencyMs: 1000, costUsd: 0.01 } },
  { version: "pr", metrics: { passRate: 0.7, toolCallAccuracy: 0.7, groundedness: 0.7, avgLatencyMs: 2000, costUsd: 0.02 } },
);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(failing.ok, false);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.match(renderMarkdownReport(failing), /Gate: FAIL/);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.match(createGithubActionsWorkflow(), /npm run day70:ci/);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const gate = runCiGate();
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(gate.ok, true);
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const demo = runDemo();
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.day, 70);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.match(demo.workflow, /pull_request/);

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day70 tests passed");
