/**
 * Day 42：自包含学习源码。
 *
 * 这个文件属于 day42-permission-aware-tools，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：用 admin 预热资源全集，再按当前用户权限过滤，避免 Agent 绕过权限。
export function createPermissionSnapshot() {
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

function hasRole(user, roles) {
  return roles.includes(user.id) || roles.some((role) => user.roles.includes(role));
}

export function canAccessResource(user, resource, action = "read") {
  if (user.roles.includes("admin")) return true;
  if (action === "read") {
    return hasRole(user, resource.viewers) || hasRole(user, resource.editors);
  }
  return hasRole(user, resource.editors);
}

export function filterResourcesForUser(user, snapshot = createPermissionSnapshot(), action = "read") {
  return snapshot.resources.filter((resource) => canAccessResource(user, resource, action));
}

// 工具调用必须先过权限检查；模型只能提出意图，不能直接拿资源。
export function executeToolCall({ user, tool, resourceId, action = "read" }, snapshot = createPermissionSnapshot()) {
  const resource = snapshot.resources.find((item) => item.id === resourceId);
  if (!resource) {
    return { ok: false, code: "not_found", message: `resource not found: ${resourceId}` };
  }
  if (!canAccessResource(user, resource, action)) {
    return {
      ok: false,
      code: "forbidden",
      message: `${user.id} cannot ${action} ${resource.id}`,
      audit: { user: user.id, tool, resourceId, action, allowed: false },
    };
  }
  return {
    ok: true,
    tool,
    resource,
    audit: { user: user.id, tool, resourceId, action, allowed: true },
  };
}

export function runDemo() {
  const snapshot = createPermissionSnapshot();
  const alice = { id: "alice", roles: ["developer"] };
  const sre = { id: "ren", roles: ["sre"] };
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
