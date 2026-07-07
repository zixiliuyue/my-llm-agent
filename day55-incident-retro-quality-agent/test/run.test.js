/**
 * Day 55：自包含学习源码。
 *
 * 这个文件属于 day55-incident-retro-quality-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证事故复盘质量评估会检查时间线、影响面、根因、证据、修复、预防和脱敏。
import assert from "node:assert/strict";
import { createMockRetroReport, evaluateRetroQuality } from "../src/index.js";

const ready = evaluateRetroQuality(createMockRetroReport());
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(ready.status, "ready");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(ready.score, ready.maxScore);

const leak = evaluateRetroQuality(createMockRetroReport({
  rawText: "token=secret password=<redacted>",
}));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.notEqual(leak.status, "ready");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(leak.checks.find((item) => item.id === "redaction").ok, false);

const incomplete = evaluateRetroQuality(createMockRetroReport({
  timeline: [],
  rootCause: "unknown",
  evidence: [],
  prevention: [],
}));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(incomplete.status, "incomplete");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(incomplete.missing.includes("timeline"));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(incomplete.missing.includes("evidence"));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(incomplete.nextActions.length >= 3);

console.log("day55 tests passed");
