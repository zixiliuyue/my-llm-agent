// 学习目标：模拟“后台 admin 预热全集，当前用户查询时过滤”的权限排障链路。
export function createMockPermissionCase(overrides = {}) {
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

function isLegacyToken(value) {
  return /^api[_-]?token$/i.test(String(value || ""));
}

// 真实用户身份不能被 api_token 这类历史兼容值截断，必须继续找 cookie/header 里的用户。
export function resolveEffectiveUser(headers = {}) {
  const candidates = [headers.currentuser, headers.job_user, headers.cookieUser, headers.xwebauth_user];
  return candidates.find((item) => item && !isLegacyToken(item)) || null;
}

export function filterResourcesForUser(resources, aclSnapshot, user) {
  return resources.filter((resource) => {
    const allowedUsers = aclSnapshot[resource.project] || [];
    return allowedUsers.includes(user);
  });
}

export function diagnosePermissionCase(input = createMockPermissionCase()) {
  const effectiveUser = resolveEffectiveUser(input.headers);
  const evidence = [
    `route=${input.route}`,
    `project=${input.project}`,
    `requested_user=${input.user}`,
    `effective_user=${effectiveUser || "missing"}`,
    `redis_permission=${input.redisUserPermission ? "present" : "missing"}`,
    `menu_has_quill=${input.menuRoutes.includes("event/quill")}`,
    `admin_resources=${input.adminResources.length}`,
  ];

  if (!effectiveUser) {
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

  if (!input.redisUserPermission) {
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

  const visibleResources = filterResourcesForUser(input.adminResources, input.aclSnapshot, effectiveUser);
  if (!input.redisUserPermission.projects.includes(input.project)) {
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

export function runDemo() {
  return diagnosePermissionCase(createMockPermissionCase());
}
