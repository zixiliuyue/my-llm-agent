/**
 * Day 41：自包含学习源码。
 *
 * 这个文件属于 day41-ops-diagnosis-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证排障结论必须来自证据，不允许空口猜测。
import assert from "node:assert/strict";
import { buildDiagnosisHypotheses, collectOpsEvidence, createMockOpsSnapshot, diagnoseIncident } from "../src/index.js";

const snapshot = createMockOpsSnapshot({
  metrics: { errorRate: 0.09, p95LatencyMs: 2200, trafficRps: 100, up: 1 },
});
const evidence = collectOpsEvidence(snapshot);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(evidence.severity, "high");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(evidence.evidence.some((item) => item.includes("mongo query timeout")));

const hypotheses = buildDiagnosisHypotheses(snapshot);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(hypotheses.some((item) => item.id === "dependency-degraded"));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(hypotheses.some((item) => item.id === "recent-deploy"));

const report = diagnoseIncident(snapshot);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(report.day, 41);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(report.localOnly, true);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(report.nextActions.length >= 3);

console.log("day41 tests passed");
