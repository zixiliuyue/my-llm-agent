/**
 * Day 51：自包含学习源码。
 *
 * 这个文件属于 day51-config-hot-reload-diagnosis-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证配置热更新诊断不会把重启后的版本一致误判成热更新成功。
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createMockConfigReloadSnapshot, diagnoseConfigReload } from "../src/index.js";

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const confirmed = diagnoseConfigReload(createMockConfigReloadSnapshot());
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(confirmed.status, "hot-reload-confirmed");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(confirmed.evidence.some((item) => item.includes("reload config done")));

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const masked = diagnoseConfigReload(createMockConfigReloadSnapshot({
  processStartedAt: "2026-05-25T10:05:00Z",
  restartCount: 1,
}));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(masked.status, "restart-masked-reload");

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const missing = diagnoseConfigReload(createMockConfigReloadSnapshot({
  fileVersion: "cfg-new",
  runtimeVersion: "cfg-old",
  health: { statusCode: 200, configVersion: "cfg-old" },
  reloadEvents: [],
}));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(missing.status, "reload-missing");

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const rollback = diagnoseConfigReload(createMockConfigReloadSnapshot({
  fileVersion: "cfg-new",
  runtimeVersion: "cfg-old",
  health: { statusCode: 200, configVersion: "cfg-old" },
  reloadEvents: [{ time: "2026-05-25T10:04:04Z", ok: false, message: "yaml parse error" }],
  backupRestored: true,
}));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(rollback.status, "reload-failed-rollback");

// 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day51 tests passed");
