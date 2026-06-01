/**
 * Day 47：自包含学习源码。
 *
 * 这个文件属于 day47-permission-cache-debugger，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：模拟“后台 admin 预热全集，当前用户查询时过滤”的权限排障链路。
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createMockPermissionCase(overrides = {}) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    user: overrides.user ?? "alice@example.com",
    headers: overrides.headers ?? { currentuser: "alice@example.com", cookieUser: "alice@example.com" },
    route: overrides.route ?? "/api/event/quill/detail/123",
    project: overrides.project ?? "FREEFIRE",
    redisUserPermission: overrides.redisUserPermission ?? null,
    menuRoutes: overrides.menuRoutes ?? ["dashboard/kaopuyun_ddos", "event/quill"],
    adminResources: overrides.adminResources ?? [
      { id: "dash-freefire", project: "FREEFIRE", title: "FreeFire Dashboard" },
      { id: "dash-shopee", project: "SHOPEE", title: "Shopee Dashboard" },
    ],
    aclSnapshot: overrides.aclSnapshot ?? {
      FREEFIRE: ["alice@example.com", "bob@example.com"],
      SHOPEE: ["bob@example.com"],
    },
  };
}

// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function isLegacyToken(value) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return /^api[_-]?token$/i.test(String(value || ""));
}

// 真实用户身份不能被 api_token 这类历史兼容值截断，必须继续找 cookie/header 里的用户。
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function resolveEffectiveUser(headers = {}) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const candidates = [headers.currentuser, headers.job_user, headers.cookieUser, headers.xwebauth_user];
  // 返回结果：调用方会拿到这个值继续后续流程。
  return candidates.find((item) => item && !isLegacyToken(item)) || null;
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function filterResourcesForUser(resources, aclSnapshot, user) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return resources.filter((resource) => {
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const allowedUsers = aclSnapshot[resource.project] || [];
    // 返回结果：调用方会拿到这个值继续后续流程。
    return allowedUsers.includes(user);
  });
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function diagnosePermissionCase(input = createMockPermissionCase()) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const effectiveUser = resolveEffectiveUser(input.headers);
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const evidence = [
    `route=${input.route}`,
    `project=${input.project}`,
    `requested_user=${input.user}`,
    `effective_user=${effectiveUser || "missing"}`,
    `redis_permission=${input.redisUserPermission ? "present" : "missing"}`,
    `menu_has_quill=${input.menuRoutes.includes("event/quill")}`,
    `admin_resources=${input.adminResources.length}`,
  ];

  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!effectiveUser) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return {
      day: 47,
      title: "权限缓存排障 Agent",
      localOnly: true,
      rootCause: "effective-user-missing",
      evidence,
      visibleResources: [],
      nextActions: ["先修正真实用户透传，不要把 api_token 当最终用户。"],
    };
  }

  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!input.redisUserPermission) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return {
      day: 47,
      title: "权限缓存排障 Agent",
      localOnly: true,
      rootCause: "user-permission-cache-missing",
      evidence,
      visibleResources: [],
      nextActions: ["检查权限缓存写入任务", "确认用户邮箱是否匹配", "不要直接放开 admin 预热全集。"],
    };
  }

  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const visibleResources = filterResourcesForUser(input.adminResources, input.aclSnapshot, effectiveUser);
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!input.redisUserPermission.projects.includes(input.project)) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return {
      day: 47,
      title: "权限缓存排障 Agent",
      localOnly: true,
      rootCause: "project-not-granted",
      evidence,
      visibleResources,
      nextActions: ["检查项目权限配置", "确认 Redis 用户权限缓存是否过期。"],
    };
  }

  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 47,
    title: "权限缓存排障 Agent",
    localOnly: true,
    rootCause: visibleResources.length ? "allowed" : "acl-snapshot-missing-user",
    evidence,
    visibleResources,
    nextActions: visibleResources.length
      ? ["继续检查前端菜单路由和接口细分权限。"]
      : ["检查 admin 预热 ACL snapshot 是否包含当前用户。"],
  };
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo() {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return diagnosePermissionCase(createMockPermissionCase());
}
