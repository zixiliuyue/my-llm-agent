/**
 * Day 52：自包含学习源码。
 *
 * 这个文件属于 day52-frontend-permission-route-checker，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：用确定性规则检查前端权限路由，而不是靠页面看起来能打开就算通过。
// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createMockFrontendRouteSnapshot(overrides = {}) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
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

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function pathSet(items) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return new Set(items.map((item) => item.path));
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function checkFrontendPermissionRoutes(snapshot = createMockFrontendRouteSnapshot()) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const routePaths = pathSet(snapshot.routes);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const menuPaths = pathSet(snapshot.menus);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const permissionRoutes = new Set(snapshot.permissionRoutes);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const i18nKeys = new Set(snapshot.i18nKeys);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const issues = [];

  // 教学：循环：按顺序处理多条数据或多个步骤。
  for (const route of snapshot.routes) {
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!permissionRoutes.has(route.path)) {
      issues.push({ type: "route-not-in-permission-tree", route: route.path });
    }
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (route.meta?.titleKey && !i18nKeys.has(route.meta.titleKey)) {
      issues.push({ type: "missing-i18n-key", route: route.path, key: route.meta.titleKey });
    }
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (route.hidden) {
      // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (!route.meta?.activeMenu) {
        issues.push({ type: "hidden-route-missing-active-menu", route: route.path });
      } else if (!routePaths.has(route.meta.activeMenu) && !menuPaths.has(route.meta.activeMenu)) {
        issues.push({ type: "active-menu-target-missing", route: route.path, activeMenu: route.meta.activeMenu });
      }
    }
  }

  // 教学：循环：按顺序处理多条数据或多个步骤。
  for (const menu of snapshot.menus) {
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!permissionRoutes.has(menu.path)) {
      issues.push({ type: "menu-not-in-permission-tree", menu: menu.path });
    }
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!i18nKeys.has(menu.titleKey)) {
      issues.push({ type: "missing-menu-i18n-key", menu: menu.path, key: menu.titleKey });
    }
  }

  // 教学：循环：按顺序处理多条数据或多个步骤。
  for (const jump of snapshot.jumpTargets) {
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!routePaths.has(jump.routePath)) {
      issues.push({ type: "jump-target-missing-route", jump: jump.name, route: jump.routePath });
    } else if (!permissionRoutes.has(jump.routePath)) {
      issues.push({ type: "jump-target-not-permitted", jump: jump.name, route: jump.routePath });
    }
  }

  // 教学：返回结果：调用方会拿到这个值继续后续流程。
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

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo() {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return checkFrontendPermissionRoutes(createMockFrontendRouteSnapshot());
}
