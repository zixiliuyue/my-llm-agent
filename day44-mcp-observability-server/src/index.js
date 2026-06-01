/**
 * Day 44：自包含学习源码。
 *
 * 这个文件属于 day44-mcp-observability-server，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：用最小 JSON-RPC mock 理解 MCP 观测工具 server 的工具列表和调用边界。
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
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

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function listTools() {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return TOOLS;
}

// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function callTool(name, args = {}) {
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (name === "query_prometheus") {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return { series: [{ metric: args.query, points: [[0, 1], [60, 0.91]] }], source: "mock-prometheus" };
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (name === "search_logs") {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return { hits: [{ level: "error", message: `${args.keyword} timeout`, count: 7 }], source: "mock-logs" };
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (name === "read_deploy_history") {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return { deploys: [{ service: args.service, version: "2026.05.25.1", minutesAgo: 9 }], source: "mock-deploys" };
  }
  // 抛出错误：让调用方知道当前流程不能继续。
  throw new Error(`unknown tool: ${name}`);
}

// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function result(id, value) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return { jsonrpc: "2.0", id, result: value };
}

// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function error(id, code, message) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return { jsonrpc: "2.0", id, error: { code, message } };
}

// 只实现教学所需的最小请求处理，帮助理解 MCP 工具边界。
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function handleJsonRpcRequest(request) {
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!request || request.jsonrpc !== "2.0") {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return error(request?.id ?? null, -32600, "invalid request");
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (request.method === "tools/list") {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return result(request.id, { tools: listTools() });
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (request.method === "tools/call") {
    // try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
    try {
      // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const { name, arguments: args } = request.params ?? {};
      // 返回结果：调用方会拿到这个值继续后续流程。
      return result(request.id, { content: [{ type: "json", json: callTool(name, args) }] });
    // catch 块：把异常转换成可理解的错误结果或退出码。
    } catch (toolError) {
      // 返回结果：调用方会拿到这个值继续后续流程。
      return error(request.id, -32602, toolError.message);
    }
  }
  // 返回结果：调用方会拿到这个值继续后续流程。
  return error(request.id, -32601, `method not found: ${request.method}`);
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo() {
  // 返回结果：调用方会拿到这个值继续后续流程。
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
