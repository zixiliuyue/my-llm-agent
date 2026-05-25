// 学习目标：验证发布后检查能区分通过、观察和回滚。
import assert from "node:assert/strict";
import { collectReleaseChecks, createMockReleaseSnapshot, decideRelease } from "../src/index.js";

const pass = decideRelease(createMockReleaseSnapshot());
assert.equal(pass.decision, "pass");
assert.equal(pass.rollbackPlan, null);

const rollback = decideRelease(createMockReleaseSnapshot({
  health: { ready: false, statusCode: 503, latencyMs: 3000 },
}));
assert.equal(rollback.decision, "rollback");
assert.ok(rollback.rollbackPlan);

const watch = decideRelease(createMockReleaseSnapshot({
  frontend: { expectedHash: "app.new.js", loadedHash: "app.old.js" },
}));
assert.equal(watch.decision, "watch");

const checks = collectReleaseChecks(createMockReleaseSnapshot({ deployedVersion: "old" }));
assert.equal(checks.find((item) => item.id === "version").ok, false);

console.log("day49 tests passed");
