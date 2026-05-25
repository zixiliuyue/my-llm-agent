// 学习目标：验证前端权限路由检查能发现 hidden route、activeMenu、i18n 和跳转权限问题。
import assert from "node:assert/strict";
import { checkFrontendPermissionRoutes, createMockFrontendRouteSnapshot } from "../src/index.js";

const ok = checkFrontendPermissionRoutes(createMockFrontendRouteSnapshot());
assert.equal(ok.status, "ok");
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
assert.equal(broken.status, "needs-fix");
assert.ok(broken.issues.some((item) => item.type === "hidden-route-missing-active-menu"));
assert.ok(broken.issues.some((item) => item.type === "missing-i18n-key"));
assert.ok(broken.issues.some((item) => item.type === "jump-target-not-permitted"));

console.log("day52 tests passed");
