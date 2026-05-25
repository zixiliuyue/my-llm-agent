// 学习目标：验证权限排障不会把 admin 预热全集直接暴露给当前用户。
import assert from "node:assert/strict";
import { createMockPermissionCase, diagnosePermissionCase, filterResourcesForUser, resolveEffectiveUser } from "../src/index.js";

const missing = diagnosePermissionCase(createMockPermissionCase());
assert.equal(missing.rootCause, "user-permission-cache-missing");
assert.equal(missing.visibleResources.length, 0);

const allowed = diagnosePermissionCase(createMockPermissionCase({
  redisUserPermission: { projects: ["FREEFIRE"] },
}));
assert.equal(allowed.rootCause, "allowed");
assert.deepEqual(allowed.visibleResources.map((item) => item.id), ["dash-freefire"]);

const user = resolveEffectiveUser({ currentuser: "api_token", cookieUser: "alice@example.com" });
assert.equal(user, "alice@example.com");

const filtered = filterResourcesForUser(createMockPermissionCase().adminResources, createMockPermissionCase().aclSnapshot, "bob@example.com");
assert.equal(filtered.length, 2);

console.log("day47 tests passed");
