// 学习目标：验证观测诊断会先识别工具链问题，再判断业务服务问题。
import assert from "node:assert/strict";
import { classifyObservabilitySignals, createMockObservabilitySnapshot, diagnoseObservability } from "../src/index.js";

const accessIssue = diagnoseObservability(createMockObservabilitySnapshot({
  grafana: { status: 403, dashboardsVisible: false, renderContentType: "text/html" },
}));
assert.equal(accessIssue.status, "verify-observability-first");
assert.ok(accessIssue.hypotheses.some((item) => item.id === "observability-access"));
assert.ok(accessIssue.hypotheses.some((item) => item.id === "render-contract-broken"));

const stale = classifyObservabilitySignals(createMockObservabilitySnapshot({
  metrics: { prometheusFresh: false, errorRate: 0, p95LatencyMs: 100, trafficRps: 20 },
}));
assert.ok(stale.some((item) => item.id === "datasource-stale"));

const service = diagnoseObservability(createMockObservabilitySnapshot());
assert.equal(service.day, 46);
assert.ok(service.evidence.some((item) => item.includes("error_rate")));
assert.ok(service.nextQueries.length >= 3);

console.log("day46 tests passed");
