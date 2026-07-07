/**
 * Day 42：自包含学习源码。
 *
 * 这个文件属于 day42-permission-aware-tools，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证工具调用不会绕过当前用户权限。
import assert from "node:assert/strict";
import { createPermissionSnapshot, executeToolCall, filterResourcesForUser, runDemo } from "../src/index.js";

const snapshot = createPermissionSnapshot();
const alice = { id: "alice", roles: ["developer"] };
const sre = { id: "ren", roles: ["sre"] };

// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(snapshot.builtBy, "admin@localhost");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.deepEqual(filterResourcesForUser(alice, snapshot).map((item) => item.id).sort(), ["dash-cow", "log-cm-db"]);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(filterResourcesForUser(sre, snapshot).some((item) => item.id === "dash-pay"));

const denied = executeToolCall({ user: alice, tool: "query_dashboard", resourceId: "dash-pay" }, snapshot);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(denied.ok, false);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(denied.code, "forbidden");

const allowed = executeToolCall({ user: sre, tool: "query_dashboard", resourceId: "dash-pay" }, snapshot);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(allowed.ok, true);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(allowed.audit.allowed, true);

// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runDemo().day, 42);

console.log("day42 tests passed");
