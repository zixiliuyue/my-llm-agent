/**
 * Day 66：Sandbox Executor。
 *
 * 学习目标：把 day61 的安全策略推进到“执行器”层，展示不受信任 JavaScript/Python
 * 代码如何先被静态策略检查，再进入受限 VM 或 Docker dry-run 容器规格。
 */
import vm from "node:vm";

const DANGEROUS_PATTERNS = [
  { id: "node-process", pattern: /\bprocess\b/ },
  { id: "node-require", pattern: /\brequire\s*\(/ },
  { id: "node-import-fs", pattern: /from\s+["']node:fs["']|from\s+["']fs["']/ },
  { id: "python-import-os", pattern: /^\s*import\s+os\b/m },
  { id: "python-subprocess", pattern: /\bsubprocess\b/ },
  { id: "network-fetch", pattern: /\bfetch\s*\(|\bhttp[s]?:\/\// },
];

/** 对待执行代码做静态策略检查；真实系统还要叠加 AST parser 和运行时隔离。 */
export function inspectCode({ language, code }, policy) {
  const risks = [];
  if (!policy.allowedLanguages.includes(language)) {
    risks.push({ id: "language-denied", severity: "high", language });
  }
  for (const rule of DANGEROUS_PATTERNS) {
    if (rule.pattern.test(code)) risks.push({ id: rule.id, severity: "high" });
  }
  if (code.length > policy.maxCodeBytes) {
    risks.push({ id: "code-too-large", severity: "medium", bytes: code.length });
  }
  return {
    allowed: !risks.some((risk) => risk.severity === "high"),
    risks,
  };
}

/** 生成 Docker 运行规格；这里仅 dry-run，便于在无 Docker 的 CI 中测试。 */
export function buildDockerSandboxSpec({ language, code }, policy) {
  const image = language === "python" ? policy.pythonImage : policy.nodeImage;
  const command = language === "python"
    ? ["python", "-I", "-c", code]
    : ["node", "--no-network-family-autoselection", "-e", code];
  return {
    dryRun: true,
    image,
    command,
    limits: {
      cpus: policy.cpuQuota,
      memory: policy.memoryLimit,
      timeoutMs: policy.timeoutMs,
      pidsLimit: 64,
    },
    isolation: {
      network: "none",
      readOnlyRootFilesystem: true,
      tmpfs: ["/tmp:rw,noexec,nosuid,size=16m"],
      capDrop: ["ALL"],
      securityOpt: ["no-new-privileges:true"],
    },
  };
}

/** 在 Node VM 中运行一小段 JavaScript；仅用于教学，不替代进程级容器隔离。 */
export function runJavaScriptVm(code, policy) {
  const output = [];
  const context = vm.createContext({
    console: {
      log: (...args) => output.push(args.join(" ")),
    },
    Math,
    JSON,
  });
  try {
    const script = new vm.Script(code, { filename: "agent-generated.js" });
    const value = script.runInContext(context, { timeout: policy.timeoutMs });
    return { ok: true, output, value };
  } catch (error) {
    return { ok: false, output, error: error instanceof Error ? error.message : String(error) };
  }
}

/** 统一执行入口：安全检查通过后，JS 走 VM；Python 只输出 Docker dry-run。 */
export function executeUntrustedCode(request, policy = defaultPolicy()) {
  const inspection = inspectCode(request, policy);
  const dockerSpec = buildDockerSandboxSpec(request, policy);
  if (!inspection.allowed) {
    return { status: "blocked", inspection, dockerSpec, result: null };
  }
  if (request.language === "javascript") {
    return { status: "vm-executed", inspection, dockerSpec, result: runJavaScriptVm(request.code, policy) };
  }
  return { status: "docker-dry-run", inspection, dockerSpec, result: null };
}

/** 默认策略：允许 JS/Python，但禁止网络、文件系统、子进程和宿主对象。 */
export function defaultPolicy() {
  return {
    allowedLanguages: ["javascript", "python"],
    maxCodeBytes: 8_192,
    timeoutMs: 200,
    cpuQuota: "0.5",
    memoryLimit: "128m",
    nodeImage: "node:22-alpine",
    pythonImage: "python:3.12-alpine",
  };
}

/** CLI demo：展示安全 JS、危险 JS 和 Python dry-run 三条路径。 */
export function runDemo() {
  const policy = defaultPolicy();
  return {
    day: 66,
    title: "sandbox-executor",
    localOnly: true,
    safeJavaScript: executeUntrustedCode({ language: "javascript", code: "console.log('safe'); 1 + 2" }, policy),
    blockedJavaScript: executeUntrustedCode({ language: "javascript", code: "process.env.SECRET" }, policy),
    pythonDryRun: executeUntrustedCode({ language: "python", code: "print(1 + 2)" }, policy),
  };
}
