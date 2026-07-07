/**
 * Day 52：自包含学习源码。
 *
 * 这个文件属于 day52-frontend-permission-route-checker，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证前端权限路由检查能发现 hidden route、activeMenu、i18n 和跳转权限问题。
import assert from "node:assert/strict";
import { checkFrontendPermissionRoutes, createMockFrontendRouteSnapshot } from "../src/index.js";

const ok = checkFrontendPermissionRoutes(createMockFrontendRouteSnapshot());
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(ok.status, "ok");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(ok.issues.length, 0);

const broken = checkFrontendPermissionRoutes(createMockFrontendRouteSnapshot({
  routes: [
    { path: "/parent", hidden: false, meta: { titleKey: "menu.parent" } },
    { path: "/parent/detail", hidden: true, meta: { titleKey: "detail.missing" } },
  ],
  menus: [{ path: "/parent", titleKey: "menu.parent" }],
  permissionRoutes: ["/parent"],
  i18nKeys: ["menu.parent"],
  jumpTargets: [{ name: "DetailCard", routePath: "/parent/detail" }],
}));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(broken.status, "needs-fix");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(broken.issues.some((item) => item.type === "hidden-route-missing-active-menu"));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(broken.issues.some((item) => item.type === "missing-i18n-key"));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(broken.issues.some((item) => item.type === "jump-target-not-permitted"));

console.log("day52 tests passed");
