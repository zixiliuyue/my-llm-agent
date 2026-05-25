/**
 * Day 63 测试：验证版本注册、灰度路由、shadow compare 和回滚 gate。
 */
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createReleasePlan, createVersionRegistry, evaluateRelease, routeByGrayPercent, runDemo, shadowCompare } from "../src/index.js";

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const registry = createVersionRegistry();
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const v1 = registry.register("prompt", { text: "a" });
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const v2 = registry.register("prompt", { text: "b" });
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(v1.id, "prompt-v1");
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(registry.latest("prompt").id, v2.id);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(registry.get(v1.id).payload.text, "a");

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const plan = createReleasePlan({ id: "rel", stableVersion: v1.id, candidateVersion: v2.id, grayPercent: 100 });
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(routeByGrayPercent("user-a", plan), v2.id);
plan.grayPercent = 0;
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(routeByGrayPercent("user-a", plan), v1.id);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const shadow = shadowCompare(
  { toolPlan: ["a"], groundedness: 0.8, latencyMs: 100 },
  { toolPlan: ["a"], groundedness: 0.9, latencyMs: 120 },
);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(shadow.pass, true);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const failed = evaluateRelease(plan, { evalScore: 0.7, errorRate: 0.05, p95LatencyMs: 3000, toolFailureRate: 0.01 });
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(failed.status, "rollback-required");
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(failed.audit.nextVersion, v1.id);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const passed = evaluateRelease({ ...plan, grayPercent: 10 }, { evalScore: 0.95, errorRate: 0.01, p95LatencyMs: 1000, toolFailureRate: 0.01 });
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(passed.status, "canary-passed");

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const demo = runDemo();
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.day, 63);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.evaluation.status, "canary-passed");

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day63 tests passed");
