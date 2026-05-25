/**
 * Day 42：自包含学习源码。
 *
 * 这个文件属于 day42-permission-aware-tools，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：用 admin 预热资源全集，再按当前用户权限过滤，避免 Agent 绕过权限。
// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createPermissionSnapshot() {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    builtBy: "admin@localhost",
    resources: [
      { id: "dash-cow", type: "grafana-dashboard", name: "COW Concise", viewers: ["alice", "bob"], editors: ["sre"] },
      { id: "dash-pay", type: "grafana-dashboard", name: "Payment Private", viewers: ["sre"], editors: ["sre"] },
      { id: "host-202", type: "host", name: "test-env-202", viewers: ["sre"], editors: ["sre"] },
      { id: "log-cm-db", type: "log-stream", name: "cmdb error log", viewers: ["alice", "sre"], editors: [] },
    ],
  };
}

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function hasRole(user, roles) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return roles.includes(user.id) || roles.some((role) => user.roles.includes(role));
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function canAccessResource(user, resource, action = "read") {
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (user.roles.includes("admin")) return true;
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (action === "read") {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return hasRole(user, resource.viewers) || hasRole(user, resource.editors);
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return hasRole(user, resource.editors);
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function filterResourcesForUser(user, snapshot = createPermissionSnapshot(), action = "read") {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return snapshot.resources.filter((resource) => canAccessResource(user, resource, action));
}

// 工具调用必须先过权限检查；模型只能提出意图，不能直接拿资源。
// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function executeToolCall({ user, tool, resourceId, action = "read" }, snapshot = createPermissionSnapshot()) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const resource = snapshot.resources.find((item) => item.id === resourceId);
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!resource) {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return { ok: false, code: "not_found", message: `resource not found: ${resourceId}` };
  }
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!canAccessResource(user, resource, action)) {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return {
      ok: false,
      code: "forbidden",
      message: `${user.id} cannot ${action} ${resource.id}`,
      audit: { user: user.id, tool, resourceId, action, allowed: false },
    };
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    ok: true,
    tool,
    resource,
    audit: { user: user.id, tool, resourceId, action, allowed: true },
  };
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo() {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const snapshot = createPermissionSnapshot();
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const alice = { id: "alice", roles: ["developer"] };
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const sre = { id: "ren", roles: ["sre"] };
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 42,
    title: "权限感知工具调用",
    prewarm: { builtBy: snapshot.builtBy, total: snapshot.resources.length },
    aliceVisible: filterResourcesForUser(alice, snapshot).map((item) => item.id),
    sreVisible: filterResourcesForUser(sre, snapshot).map((item) => item.id),
    deniedExample: executeToolCall({ user: alice, tool: "query_dashboard", resourceId: "dash-pay" }, snapshot),
    allowedExample: executeToolCall({ user: sre, tool: "query_dashboard", resourceId: "dash-pay" }, snapshot),
  };
}
