/**
 * Day 46：自包含学习源码。
 *
 * 这个文件属于 day46-observability-diagnosis-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证观测诊断会先识别工具链问题，再判断业务服务问题。
import assert from "node:assert/strict";
import { classifyObservabilitySignals, createMockObservabilitySnapshot, diagnoseObservability } from "../src/index.js";

const accessIssue = diagnoseObservability(createMockObservabilitySnapshot({
  grafana: { status: 403, dashboardsVisible: false, renderContentType: "text/html" },
}));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(accessIssue.status, "verify-observability-first");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(accessIssue.hypotheses.some((item) => item.id === "observability-access"));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(accessIssue.hypotheses.some((item) => item.id === "render-contract-broken"));

const stale = classifyObservabilitySignals(createMockObservabilitySnapshot({
  metrics: { prometheusFresh: false, errorRate: 0, p95LatencyMs: 100, trafficRps: 20 },
}));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(stale.some((item) => item.id === "datasource-stale"));

const service = diagnoseObservability(createMockObservabilitySnapshot());
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(service.day, 46);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(service.evidence.some((item) => item.includes("error_rate")));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(service.nextQueries.length >= 3);

console.log("day46 tests passed");
