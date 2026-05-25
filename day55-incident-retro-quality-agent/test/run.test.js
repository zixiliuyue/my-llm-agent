// 学习目标：验证事故复盘质量评估会检查时间线、影响面、根因、证据、修复、预防和脱敏。
import assert from "node:assert/strict";
import { createMockRetroReport, evaluateRetroQuality } from "../src/index.js";

const ready = evaluateRetroQuality(createMockRetroReport());
assert.equal(ready.status, "ready");
assert.equal(ready.score, ready.maxScore);

const leak = evaluateRetroQuality(createMockRetroReport({
  rawText: "token=secret password=<redacted>",
}));
assert.notEqual(leak.status, "ready");
assert.equal(leak.checks.find((item) => item.id === "redaction").ok, false);

const incomplete = evaluateRetroQuality(createMockRetroReport({
  timeline: [],
  rootCause: "unknown",
  evidence: [],
  prevention: [],
}));
assert.equal(incomplete.status, "incomplete");
assert.ok(incomplete.missing.includes("timeline"));
assert.ok(incomplete.missing.includes("evidence"));
assert.ok(incomplete.nextActions.length >= 3);

console.log("day55 tests passed");
