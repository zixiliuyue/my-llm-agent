/**
 * Day 55：自包含学习源码。
 *
 * 这个文件属于 day55-incident-retro-quality-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证事故复盘质量评估会检查时间线、影响面、根因、证据、修复、预防和脱敏。
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createMockRetroReport, evaluateRetroQuality } from "../src/index.js";

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const ready = evaluateRetroQuality(createMockRetroReport());
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(ready.status, "ready");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(ready.score, ready.maxScore);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const leak = evaluateRetroQuality(createMockRetroReport({
  rawText: "token=secret password=<redacted>",
}));
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.notEqual(leak.status, "ready");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(leak.checks.find((item) => item.id === "redaction").ok, false);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const incomplete = evaluateRetroQuality(createMockRetroReport({
  timeline: [],
  rootCause: "unknown",
  evidence: [],
  prevention: [],
}));
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(incomplete.status, "incomplete");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(incomplete.missing.includes("timeline"));
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(incomplete.missing.includes("evidence"));
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(incomplete.nextActions.length >= 3);

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day55 tests passed");
