/**
 * Day 66：Sandbox Executor。
 *
 * 学习目标：把 day61 的安全策略推进到“执行器”层，展示不受信任 JavaScript/Python
 * 代码如何先被静态策略检查，再进入受限 VM 或 Docker dry-run 容器规格。
 */
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import vm from "node:vm";

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const DANGEROUS_PATTERNS = [
  { id: "node-process", pattern: /\bprocess\b/ },
  { id: "node-require", pattern: /\brequire\s*\(/ },
  { id: "node-import-fs", pattern: /from\s+["']node:fs["']|from\s+["']fs["']/ },
  { id: "python-import-os", pattern: /^\s*import\s+os\b/m },
  { id: "python-subprocess", pattern: /\bsubprocess\b/ },
  { id: "network-fetch", pattern: /\bfetch\s*\(|\bhttp[s]?:\/\// },
];

/** 对待执行代码做静态策略检查；真实系统还要叠加 AST parser 和运行时隔离。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function inspectCode({ language, code }, policy) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const risks = [];
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!policy.allowedLanguages.includes(language)) {
    risks.push({ id: "language-denied", severity: "high", language });
  }
  // 教学：循环：按顺序处理多条数据或多个步骤。
  for (const rule of DANGEROUS_PATTERNS) {
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (rule.pattern.test(code)) risks.push({ id: rule.id, severity: "high" });
  }
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (code.length > policy.maxCodeBytes) {
    risks.push({ id: "code-too-large", severity: "medium", bytes: code.length });
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    allowed: !risks.some((risk) => risk.severity === "high"),
    risks,
  };
}

/** 生成 Docker 运行规格；这里仅 dry-run，便于在无 Docker 的 CI 中测试。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function buildDockerSandboxSpec({ language, code }, policy) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const image = language === "python" ? policy.pythonImage : policy.nodeImage;
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const command = language === "python"
    ? ["python", "-I", "-c", code]
    : ["node", "--no-network-family-autoselection", "-e", code];
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
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
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function runJavaScriptVm(code, policy) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const output = [];
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const context = vm.createContext({
    console: {
      log: (...args) => output.push(args.join(" ")),
    },
    Math,
    JSON,
  });
  // 教学：try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
  try {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const script = new vm.Script(code, { filename: "agent-generated.js" });
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const value = script.runInContext(context, { timeout: policy.timeoutMs });
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return { ok: true, output, value };
  // 教学：catch 块：把异常转换成可理解的错误结果或退出码。
  } catch (error) {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return { ok: false, output, error: error instanceof Error ? error.message : String(error) };
  }
}

/** 统一执行入口：安全检查通过后，JS 走 VM；Python 只输出 Docker dry-run。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function executeUntrustedCode(request, policy = defaultPolicy()) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const inspection = inspectCode(request, policy);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const dockerSpec = buildDockerSandboxSpec(request, policy);
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!inspection.allowed) {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return { status: "blocked", inspection, dockerSpec, result: null };
  }
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (request.language === "javascript") {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return { status: "vm-executed", inspection, dockerSpec, result: runJavaScriptVm(request.code, policy) };
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return { status: "docker-dry-run", inspection, dockerSpec, result: null };
}

/** 默认策略：允许 JS/Python，但禁止网络、文件系统、子进程和宿主对象。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function defaultPolicy() {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
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
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function runDemo() {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const policy = defaultPolicy();
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 66,
    title: "sandbox-executor",
    localOnly: true,
    safeJavaScript: executeUntrustedCode({ language: "javascript", code: "console.log('safe'); 1 + 2" }, policy),
    blockedJavaScript: executeUntrustedCode({ language: "javascript", code: "process.env.SECRET" }, policy),
    pythonDryRun: executeUntrustedCode({ language: "python", code: "print(1 + 2)" }, policy),
  };
}
