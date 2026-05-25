/**
 * Day 54：自包含学习源码。
 *
 * 这个文件属于 day54-mcp-integration-verifier，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证真实 MCP 协议入口，不把 /health、/sse 或根 URL 当成 MCP 可用。
// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createMockMcpProbe(overrides = {}) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
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

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function buildMcpEndpoint(baseUrl, candidatePath = "/mcp") {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const trimmed = String(baseUrl).replace(/\/+$/, "");
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const path = candidatePath.startsWith("/") ? candidatePath : `/${candidatePath}`;
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return `${trimmed}${path}`;
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function verifyMcpIntegration(probe = createMockMcpProbe()) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const endpoint = buildMcpEndpoint(probe.baseUrl, probe.candidatePath);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
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

  // 教学：定义变量：这个值后面会被更新，所以使用 let。
  let status = "not-mcp";
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const nextActions = [];
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (probe.candidatePath === "/health" || probe.candidatePath === "/sse" || probe.candidatePath === "/") {
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    status = "wrong-endpoint";
    nextActions.push("不要把 /health、/sse 或根 URL 当成 MCP 协议入口，继续探测 /mcp。");
  } else if (probe.http.mcpStatus !== 200) {
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    status = "mcp-http-unavailable";
    nextActions.push("先确认 /mcp HTTP 状态，再看 Codex 会话是否热加载。");
  } else if (!probe.protocol.initializeOk) {
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    status = "mcp-initialize-failed";
    nextActions.push("检查 initialize JSON-RPC 响应和 server 日志。");
  } else if (!probe.protocol.toolsListOk) {
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    status = "mcp-tools-list-failed";
    nextActions.push("检查 tools/list 是否实现；resources 为空不能单独证明 MCP 不可用。");
  } else {
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    status = "mcp-ready";
    nextActions.push("记录 endpoint、tools/list 结果和工具数量作为验收证据。");
  }

  // 教学：返回结果：调用方会拿到这个值继续后续流程。
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

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo() {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    ready: verifyMcpIntegration(createMockMcpProbe()),
    wrongEndpoint: verifyMcpIntegration(createMockMcpProbe({ candidatePath: "/health" })),
  };
}
