/**
 * Day 47：自包含学习源码。
 *
 * 这个文件属于 day47-permission-cache-debugger，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证权限排障不会把 admin 预热全集直接暴露给当前用户。
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createMockPermissionCase, diagnosePermissionCase, filterResourcesForUser, resolveEffectiveUser } from "../src/index.js";

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const missing = diagnosePermissionCase(createMockPermissionCase());
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(missing.rootCause, "user-permission-cache-missing");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(missing.visibleResources.length, 0);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const allowed = diagnosePermissionCase(createMockPermissionCase({
  redisUserPermission: { projects: ["FREEFIRE"] },
}));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(allowed.rootCause, "allowed");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.deepEqual(allowed.visibleResources.map((item) => item.id), ["dash-freefire"]);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const user = resolveEffectiveUser({ currentuser: "api_token", cookieUser: "alice@example.com" });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(user, "alice@example.com");

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const filtered = filterResourcesForUser(createMockPermissionCase().adminResources, createMockPermissionCase().aclSnapshot, "bob@example.com");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(filtered.length, 2);

// 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day47 tests passed");
