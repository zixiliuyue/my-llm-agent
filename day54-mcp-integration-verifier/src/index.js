/**
 * Day 54：自包含学习源码。
 *
 * 这个文件属于 day54-mcp-integration-verifier，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证真实 MCP 协议入口，不把 /health、/sse 或根 URL 当成 MCP 可用。
export function createMockMcpProbe(overrides = {}) {
  return {
    baseUrl: overrides.baseUrl ?? "http://127.0.0.1:18000",
    candidatePath: overrides.candidatePath ?? "/mcp",
    http: {
      rootStatus: overrides.http?.rootStatus ?? 200,
      healthStatus: overrides.http?.healthStatus ?? 200,
      sseStatus: overrides.http?.sseStatus ?? 404,
      mcpStatus: overrides.http?.mcpStatus ?? 200,
    },
    protocol: {
      initializeOk: overrides.protocol?.initializeOk ?? true,
      toolsListOk: overrides.protocol?.toolsListOk ?? true,
      discoveredTools: overrides.protocol?.discoveredTools ?? ["query_metrics", "query_logs"],
      resourcesEmpty: overrides.protocol?.resourcesEmpty ?? true,
    },
  };
}

export function buildMcpEndpoint(baseUrl, candidatePath = "/mcp") {
  const trimmed = String(baseUrl).replace(/\/+$/, "");
  const path = candidatePath.startsWith("/") ? candidatePath : `/${candidatePath}`;
  return `${trimmed}${path}`;
}

export function verifyMcpIntegration(probe = createMockMcpProbe()) {
  const endpoint = buildMcpEndpoint(probe.baseUrl, probe.candidatePath);
  const evidence = [
    `root_status=${probe.http.rootStatus}`,
    `health_status=${probe.http.healthStatus}`,
    `sse_status=${probe.http.sseStatus}`,
    `mcp_status=${probe.http.mcpStatus}`,
    `initialize_ok=${probe.protocol.initializeOk}`,
    `tools_list_ok=${probe.protocol.toolsListOk}`,
    `tools=${probe.protocol.discoveredTools.length}`,
    `resources_empty=${probe.protocol.resourcesEmpty}`,
  ];

  let status = "not-mcp";
  const nextActions = [];
  if (probe.candidatePath === "/health" || probe.candidatePath === "/sse" || probe.candidatePath === "/") {
    // 更新状态：这里会改变前面定义的变量或对象字段。
    status = "wrong-endpoint";
    nextActions.push("不要把 /health、/sse 或根 URL 当成 MCP 协议入口，继续探测 /mcp。");
  } else if (probe.http.mcpStatus !== 200) {
    // 更新状态：这里会改变前面定义的变量或对象字段。
    status = "mcp-http-unavailable";
    nextActions.push("先确认 /mcp HTTP 状态，再看 Codex 会话是否热加载。");
  } else if (!probe.protocol.initializeOk) {
    // 更新状态：这里会改变前面定义的变量或对象字段。
    status = "mcp-initialize-failed";
    nextActions.push("检查 initialize JSON-RPC 响应和 server 日志。");
  } else if (!probe.protocol.toolsListOk) {
    // 更新状态：这里会改变前面定义的变量或对象字段。
    status = "mcp-tools-list-failed";
    nextActions.push("检查 tools/list 是否实现；resources 为空不能单独证明 MCP 不可用。");
  } else {
    // 更新状态：这里会改变前面定义的变量或对象字段。
    status = "mcp-ready";
    nextActions.push("记录 endpoint、tools/list 结果和工具数量作为验收证据。");
  }

  return {
    day: 54,
    title: "MCP 接入验真 Agent",
    localOnly: true,
    endpoint,
    status,
    evidence,
    tools: probe.protocol.discoveredTools,
    nextActions,
  };
}

export function runDemo() {
  return {
    ready: verifyMcpIntegration(createMockMcpProbe()),
    wrongEndpoint: verifyMcpIntegration(createMockMcpProbe({ candidatePath: "/health" })),
  };
}
