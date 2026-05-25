// 学习目标：验证配置热更新诊断不会把重启后的版本一致误判成热更新成功。
import assert from "node:assert/strict";
import { createMockConfigReloadSnapshot, diagnoseConfigReload } from "../src/index.js";

const confirmed = diagnoseConfigReload(createMockConfigReloadSnapshot());
assert.equal(confirmed.status, "hot-reload-confirmed");
assert.ok(confirmed.evidence.some((item) => item.includes("reload config done")));

const masked = diagnoseConfigReload(createMockConfigReloadSnapshot({
  processStartedAt: "2026-05-25T10:05:00Z",
  restartCount: 1,
}));
assert.equal(masked.status, "restart-masked-reload");

const missing = diagnoseConfigReload(createMockConfigReloadSnapshot({
  fileVersion: "cfg-new",
  runtimeVersion: "cfg-old",
  health: { statusCode: 200, configVersion: "cfg-old" },
  reloadEvents: [],
}));
assert.equal(missing.status, "reload-missing");

const rollback = diagnoseConfigReload(createMockConfigReloadSnapshot({
  fileVersion: "cfg-new",
  runtimeVersion: "cfg-old",
  health: { statusCode: 200, configVersion: "cfg-old" },
  reloadEvents: [{ time: "2026-05-25T10:04:04Z", ok: false, message: "yaml parse error" }],
  backupRestored: true,
}));
assert.equal(rollback.status, "reload-failed-rollback");

console.log("day51 tests passed");
