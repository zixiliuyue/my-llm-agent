/**
 * Day 46：自包含学习源码。
 *
 * 这个文件属于 day46-observability-diagnosis-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证观测诊断会先识别工具链问题，再判断业务服务问题。
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { classifyObservabilitySignals, createMockObservabilitySnapshot, diagnoseObservability } from "../src/index.js";

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const accessIssue = diagnoseObservability(createMockObservabilitySnapshot({
  grafana: { status: 403, dashboardsVisible: false, renderContentType: "text/html" },
}));
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(accessIssue.status, "verify-observability-first");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(accessIssue.hypotheses.some((item) => item.id === "observability-access"));
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(accessIssue.hypotheses.some((item) => item.id === "render-contract-broken"));

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const stale = classifyObservabilitySignals(createMockObservabilitySnapshot({
  metrics: { prometheusFresh: false, errorRate: 0, p95LatencyMs: 100, trafficRps: 20 },
}));
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(stale.some((item) => item.id === "datasource-stale"));

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const service = diagnoseObservability(createMockObservabilitySnapshot());
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(service.day, 46);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(service.evidence.some((item) => item.includes("error_rate")));
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(service.nextQueries.length >= 3);

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day46 tests passed");
