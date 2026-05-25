// 学习目标：验证工具调用不会绕过当前用户权限。
import assert from "node:assert/strict";
import { createPermissionSnapshot, executeToolCall, filterResourcesForUser, runDemo } from "../src/index.js";

const snapshot = createPermissionSnapshot();
const alice = { id: "alice", roles: ["developer"] };
const sre = { id: "ren", roles: ["sre"] };

assert.equal(snapshot.builtBy, "admin@localhost");
assert.deepEqual(filterResourcesForUser(alice, snapshot).map((item) => item.id).sort(), ["dash-cow", "log-cm-db"]);
assert.ok(filterResourcesForUser(sre, snapshot).some((item) => item.id === "dash-pay"));

const denied = executeToolCall({ user: alice, tool: "query_dashboard", resourceId: "dash-pay" }, snapshot);
assert.equal(denied.ok, false);
assert.equal(denied.code, "forbidden");

const allowed = executeToolCall({ user: sre, tool: "query_dashboard", resourceId: "dash-pay" }, snapshot);
assert.equal(allowed.ok, true);
assert.equal(allowed.audit.allowed, true);

assert.equal(runDemo().day, 42);

console.log("day42 tests passed");
