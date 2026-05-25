// 学习目标：验证排障结论必须来自证据，不允许空口猜测。
import assert from "node:assert/strict";
import { buildDiagnosisHypotheses, collectOpsEvidence, createMockOpsSnapshot, diagnoseIncident } from "../src/index.js";

const snapshot = createMockOpsSnapshot({
  metrics: { errorRate: 0.09, p95LatencyMs: 2200, trafficRps: 100, up: 1 },
});
const evidence = collectOpsEvidence(snapshot);
assert.equal(evidence.severity, "high");
assert.ok(evidence.evidence.some((item) => item.includes("mongo query timeout")));

const hypotheses = buildDiagnosisHypotheses(snapshot);
assert.ok(hypotheses.some((item) => item.id === "dependency-degraded"));
assert.ok(hypotheses.some((item) => item.id === "recent-deploy"));

const report = diagnoseIncident(snapshot);
assert.equal(report.day, 41);
assert.equal(report.localOnly, true);
assert.ok(report.nextActions.length >= 3);

console.log("day41 tests passed");
