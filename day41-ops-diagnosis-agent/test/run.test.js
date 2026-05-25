/**
 * Day 41：自包含学习源码。
 *
 * 这个文件属于 day41-ops-diagnosis-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证排障结论必须来自证据，不允许空口猜测。
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { buildDiagnosisHypotheses, collectOpsEvidence, createMockOpsSnapshot, diagnoseIncident } from "../src/index.js";

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const snapshot = createMockOpsSnapshot({
  metrics: { errorRate: 0.09, p95LatencyMs: 2200, trafficRps: 100, up: 1 },
});
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const evidence = collectOpsEvidence(snapshot);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(evidence.severity, "high");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(evidence.evidence.some((item) => item.includes("mongo query timeout")));

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const hypotheses = buildDiagnosisHypotheses(snapshot);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(hypotheses.some((item) => item.id === "dependency-degraded"));
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(hypotheses.some((item) => item.id === "recent-deploy"));

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const report = diagnoseIncident(snapshot);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(report.day, 41);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(report.localOnly, true);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(report.nextActions.length >= 3);

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day41 tests passed");
