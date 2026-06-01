/**
 * Day 50：自包含学习源码。
 *
 * 这个文件属于 day50-cli-tool-manifest-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：把 CLI 能力描述成 Agent 可调用 manifest，并保留参数、风险和输出契约。
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const ENVIRONMENTS = ["dev", "sit", "pro"];

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createCliToolManifest() {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    cli: "gre",
    environments: ENVIRONMENTS,
    tools: [
      {
        id: "project.list",
        command: ["project", "list"],
        risk: "read-only",
        args: [],
        outputContract: "json array of projects",
      },
      {
        id: "host.search",
        command: ["host", "search"],
        risk: "read-only",
        args: ["keyword"],
        outputContract: "json array of hosts",
      },
      {
        id: "chart.render",
        command: ["chart", "render"],
        risk: "read-only-with-binary-output",
        args: ["dashboard", "panel"],
        outputContract: "png bytes, content-type must be image/png",
      },
    ],
  };
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function validateToolRequest(request, manifest = createCliToolManifest()) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const tool = manifest.tools.find((item) => item.id === request.toolId);
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!tool) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return { ok: false, reason: "unknown-tool" };
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!manifest.environments.includes(request.env)) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return { ok: false, reason: "invalid-environment" };
  }
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const missing = tool.args.filter((arg) => !request.params || request.params[arg] === undefined || request.params[arg] === "");
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (missing.length) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return { ok: false, reason: "missing-args", missing };
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (request.params?.baseUrl) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return { ok: false, reason: "free-form-base-url-not-allowed" };
  }
  // 返回结果：调用方会拿到这个值继续后续流程。
  return { ok: true, tool };
}

// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function formatArg(value) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const text = String(value);
  // 返回结果：调用方会拿到这个值继续后续流程。
  return /\s/.test(text) ? JSON.stringify(text) : text;
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function redactSensitiveText(value) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return String(value)
    .replace(/Authorization=Bearer\s+[^\s]+/gi, "Authorization=Bearer <redacted>")
    .replace(/token=[^\s]+/gi, "token=<redacted>")
    .replace(/password=[^\s]+/gi, "password=<redacted>")
    .replace(/client_secret=[^\s]+/gi, "client_secret=<redacted>");
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function planCliInvocation(request, manifest = createCliToolManifest()) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const validation = validateToolRequest(request, manifest);
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!validation.ok) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return {
      day: 50,
      title: "CLI 工具 manifest Agent",
      localOnly: true,
      status: "blocked",
      reason: validation.reason,
      missing: validation.missing || [],
    };
  }

  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const { tool } = validation;
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const args = ["--env", request.env, ...tool.command];
  // 循环：按顺序处理多条数据或多个步骤。
  for (const name of tool.args) {
    args.push(`--${name}`, formatArg(request.params[name]));
  }
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const commandPreview = `${manifest.cli} ${args.join(" ")}`;
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 50,
    title: "CLI 工具 manifest Agent",
    localOnly: true,
    status: "planned",
    toolId: tool.id,
    risk: tool.risk,
    commandPreview: redactSensitiveText(commandPreview),
    outputContract: tool.outputContract,
    audit: {
      env: request.env,
      dryRun: true,
      debugHeaders: redactSensitiveText(request.debugHeaders || ""),
    },
  };
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo() {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    hostSearch: planCliInvocation({ toolId: "host.search", env: "sit", params: { keyword: "cmdb" } }),
    chartRender: planCliInvocation({ toolId: "chart.render", env: "sit", params: { dashboard: "NOC", panel: "latency" } }),
    blocked: planCliInvocation({ toolId: "host.search", env: "custom", params: { keyword: "cmdb" } }),
  };
}
