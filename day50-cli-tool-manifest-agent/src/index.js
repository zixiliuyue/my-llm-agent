// 学习目标：把 CLI 能力描述成 Agent 可调用 manifest，并保留参数、风险和输出契约。
const ENVIRONMENTS = ["dev", "sit", "pro"];

export function createCliToolManifest() {
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

export function validateToolRequest(request, manifest = createCliToolManifest()) {
  const tool = manifest.tools.find((item) => item.id === request.toolId);
  if (!tool) {
    return { ok: false, reason: "unknown-tool" };
  }
  if (!manifest.environments.includes(request.env)) {
    return { ok: false, reason: "invalid-environment" };
  }
  const missing = tool.args.filter((arg) => !request.params || request.params[arg] === undefined || request.params[arg] === "");
  if (missing.length) {
    return { ok: false, reason: "missing-args", missing };
  }
  if (request.params?.baseUrl) {
    return { ok: false, reason: "free-form-base-url-not-allowed" };
  }
  return { ok: true, tool };
}

function formatArg(value) {
  const text = String(value);
  return /\s/.test(text) ? JSON.stringify(text) : text;
}

export function redactSensitiveText(value) {
  return String(value)
    .replace(/Authorization=Bearer\s+[^\s]+/gi, "Authorization=Bearer <redacted>")
    .replace(/token=[^\s]+/gi, "token=<redacted>")
    .replace(/password=[^\s]+/gi, "password=<redacted>")
    .replace(/client_secret=[^\s]+/gi, "client_secret=<redacted>");
}

export function planCliInvocation(request, manifest = createCliToolManifest()) {
  const validation = validateToolRequest(request, manifest);
  if (!validation.ok) {
    return {
      day: 50,
      title: "CLI 工具 manifest Agent",
      localOnly: true,
      status: "blocked",
      reason: validation.reason,
      missing: validation.missing || [],
    };
  }

  const { tool } = validation;
  const args = ["--env", request.env, ...tool.command];
  for (const name of tool.args) {
    args.push(`--${name}`, formatArg(request.params[name]));
  }
  const commandPreview = `${manifest.cli} ${args.join(" ")}`;
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

export function runDemo() {
  return {
    hostSearch: planCliInvocation({ toolId: "host.search", env: "sit", params: { keyword: "cmdb" } }),
    chartRender: planCliInvocation({ toolId: "chart.render", env: "sit", params: { dashboard: "NOC", panel: "latency" } }),
    blocked: planCliInvocation({ toolId: "host.search", env: "custom", params: { keyword: "cmdb" } }),
  };
}
