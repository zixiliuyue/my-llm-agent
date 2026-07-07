/**
 * Day 44：自包含学习源码。
 *
 * 这个文件属于 day44-mcp-observability-server，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：用最小 JSON-RPC mock 理解 MCP 观测工具 server 的工具列表和调用边界。
const TOOLS = [
  {
    name: "query_prometheus",
    description: "查询 mock Prometheus 指标",
    inputSchema: { type: "object", required: ["query"], properties: { query: { type: "string" } } },
  },
  {
    name: "search_logs",
    description: "搜索 mock 日志",
    inputSchema: { type: "object", required: ["keyword"], properties: { keyword: { type: "string" } } },
  },
  {
    name: "read_deploy_history",
    description: "读取 mock 发布记录",
    inputSchema: { type: "object", required: ["service"], properties: { service: { type: "string" } } },
  },
];

export function listTools() {
  return TOOLS;
}

function callTool(name, args = {}) {
  if (name === "query_prometheus") {
    return { series: [{ metric: args.query, points: [[0, 1], [60, 0.91]] }], source: "mock-prometheus" };
  }
  if (name === "search_logs") {
    return { hits: [{ level: "error", message: `${args.keyword} timeout`, count: 7 }], source: "mock-logs" };
  }
  if (name === "read_deploy_history") {
    return { deploys: [{ service: args.service, version: "2026.05.25.1", minutesAgo: 9 }], source: "mock-deploys" };
  }
  throw new Error(`unknown tool: ${name}`);
}

function result(id, value) {
  return { jsonrpc: "2.0", id, result: value };
}

function error(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

// 只实现教学所需的最小请求处理，帮助理解 MCP 工具边界。
export function handleJsonRpcRequest(request) {
  if (!request || request.jsonrpc !== "2.0") {
    return error(request?.id ?? null, -32600, "invalid request");
  }
  if (request.method === "tools/list") {
    return result(request.id, { tools: listTools() });
  }
  if (request.method === "tools/call") {
    try {
      const { name, arguments: args } = request.params ?? {};
      return result(request.id, { content: [{ type: "json", json: callTool(name, args) }] });
    } catch (toolError) {
      return error(request.id, -32602, toolError.message);
    }
  }
  return error(request.id, -32601, `method not found: ${request.method}`);
}

export function runDemo() {
  return {
    day: 44,
    title: "MCP 观测工具 Server",
    tools: listTools(),
    listResponse: handleJsonRpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    metricResponse: handleJsonRpcRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "query_prometheus", arguments: { query: "up{service='cmdb'}" } },
    }),
  };
}
