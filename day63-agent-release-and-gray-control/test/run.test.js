/**
 * Day 63 测试：验证版本注册、灰度路由、shadow compare 和回滚 gate。
 */
import assert from "node:assert/strict";
import { createReleasePlan, createVersionRegistry, evaluateRelease, routeByGrayPercent, runDemo, shadowCompare } from "../src/index.js";

const registry = createVersionRegistry();
const v1 = registry.register("prompt", { text: "a" });
const v2 = registry.register("prompt", { text: "b" });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(v1.id, "prompt-v1");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(registry.latest("prompt").id, v2.id);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(registry.get(v1.id).payload.text, "a");

const plan = createReleasePlan({ id: "rel", stableVersion: v1.id, candidateVersion: v2.id, grayPercent: 100 });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(routeByGrayPercent("user-a", plan), v2.id);
plan.grayPercent = 0;
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(routeByGrayPercent("user-a", plan), v1.id);

const shadow = shadowCompare(
  { toolPlan: ["a"], groundedness: 0.8, latencyMs: 100 },
  { toolPlan: ["a"], groundedness: 0.9, latencyMs: 120 },
);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(shadow.pass, true);

const failed = evaluateRelease(plan, { evalScore: 0.7, errorRate: 0.05, p95LatencyMs: 3000, toolFailureRate: 0.01 });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(failed.status, "rollback-required");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(failed.audit.nextVersion, v1.id);

const passed = evaluateRelease({ ...plan, grayPercent: 10 }, { evalScore: 0.95, errorRate: 0.01, p95LatencyMs: 1000, toolFailureRate: 0.01 });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(passed.status, "canary-passed");

const demo = runDemo();
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.day, 63);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.evaluation.status, "canary-passed");

console.log("day63 tests passed");
