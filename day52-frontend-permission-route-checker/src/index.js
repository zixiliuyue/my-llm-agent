/**
 * Day 52：自包含学习源码。
 *
 * 这个文件属于 day52-frontend-permission-route-checker，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：用确定性规则检查前端权限路由，而不是靠页面看起来能打开就算通过。
export function createMockFrontendRouteSnapshot(overrides = {}) {
  return {
    routes: overrides.routes ?? [
      { path: "/monitor/business_network", name: "BusinessNetwork", hidden: false, meta: { titleKey: "menu.businessNetwork" } },
      { path: "/monitor/business_network/service-probe", name: "BusinessProbe", hidden: true, meta: { titleKey: "business.probe", activeMenu: "/monitor/business_network" } },
      { path: "/dashboard/kaopuyun_ddos", name: "KaopuYunDdos", hidden: true, meta: { titleKey: "dashboard.ddos", activeMenu: "/dashboard" } },
    ],
    menus: overrides.menus ?? [
      { path: "/monitor/business_network", titleKey: "menu.businessNetwork" },
      { path: "/dashboard", titleKey: "menu.dashboard" },
    ],
    permissionRoutes: overrides.permissionRoutes ?? ["/monitor/business_network", "/monitor/business_network/service-probe", "/dashboard", "/dashboard/kaopuyun_ddos"],
    i18nKeys: overrides.i18nKeys ?? ["menu.businessNetwork", "menu.dashboard", "business.probe", "dashboard.ddos"],
    jumpTargets: overrides.jumpTargets ?? [
      { name: "KaopuYunDdosCard", routePath: "/dashboard/kaopuyun_ddos" },
    ],
  };
}

function pathSet(items) {
  return new Set(items.map((item) => item.path));
}

export function checkFrontendPermissionRoutes(snapshot = createMockFrontendRouteSnapshot()) {
  const routePaths = pathSet(snapshot.routes);
  const menuPaths = pathSet(snapshot.menus);
  const permissionRoutes = new Set(snapshot.permissionRoutes);
  const i18nKeys = new Set(snapshot.i18nKeys);
  const issues = [];

  for (const route of snapshot.routes) {
    if (!permissionRoutes.has(route.path)) {
      issues.push({ type: "route-not-in-permission-tree", route: route.path });
    }
    if (route.meta?.titleKey && !i18nKeys.has(route.meta.titleKey)) {
      issues.push({ type: "missing-i18n-key", route: route.path, key: route.meta.titleKey });
    }
    if (route.hidden) {
      if (!route.meta?.activeMenu) {
        issues.push({ type: "hidden-route-missing-active-menu", route: route.path });
      } else if (!routePaths.has(route.meta.activeMenu) && !menuPaths.has(route.meta.activeMenu)) {
        issues.push({ type: "active-menu-target-missing", route: route.path, activeMenu: route.meta.activeMenu });
      }
    }
  }

  for (const menu of snapshot.menus) {
    if (!permissionRoutes.has(menu.path)) {
      issues.push({ type: "menu-not-in-permission-tree", menu: menu.path });
    }
    if (!i18nKeys.has(menu.titleKey)) {
      issues.push({ type: "missing-menu-i18n-key", menu: menu.path, key: menu.titleKey });
    }
  }

  for (const jump of snapshot.jumpTargets) {
    if (!routePaths.has(jump.routePath)) {
      issues.push({ type: "jump-target-missing-route", jump: jump.name, route: jump.routePath });
    } else if (!permissionRoutes.has(jump.routePath)) {
      issues.push({ type: "jump-target-not-permitted", jump: jump.name, route: jump.routePath });
    }
  }

  return {
    day: 52,
    title: "前端权限路由检查 Agent",
    localOnly: true,
    status: issues.length ? "needs-fix" : "ok",
    issues,
    summary: {
      routes: snapshot.routes.length,
      menus: snapshot.menus.length,
      permissionRoutes: snapshot.permissionRoutes.length,
      jumpTargets: snapshot.jumpTargets.length,
    },
  };
}

export function runDemo() {
  return checkFrontendPermissionRoutes(createMockFrontendRouteSnapshot());
}
