/**
 * Day 49：自包含学习源码。
 *
 * 这个文件属于 day49-release-verification-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证发布后检查能区分通过、观察和回滚。
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { collectReleaseChecks, createMockReleaseSnapshot, decideRelease } from "../src/index.js";

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const pass = decideRelease(createMockReleaseSnapshot());
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(pass.decision, "pass");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(pass.rollbackPlan, null);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const rollback = decideRelease(createMockReleaseSnapshot({
  health: { ready: false, statusCode: 503, latencyMs: 3000 },
}));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(rollback.decision, "rollback");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(rollback.rollbackPlan);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const watch = decideRelease(createMockReleaseSnapshot({
  frontend: { expectedHash: "app.new.js", loadedHash: "app.old.js" },
}));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(watch.decision, "watch");

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const checks = collectReleaseChecks(createMockReleaseSnapshot({ deployedVersion: "old" }));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(checks.find((item) => item.id === "version").ok, false);

// 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day49 tests passed");
