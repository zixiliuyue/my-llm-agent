/**
 * Day 48：自包含学习源码。
 *
 * 这个文件属于 day48-safe-remote-execution-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：把远程命令请求拆成风险判断、审批摘要、dry-run 和回滚建议。
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const BLOCK_PATTERNS = [
  /\brm\s+-rf\s+\/(?:\s|$)/i,
  /\bmkfs\b/i,
  /\bdd\s+if=.*\s+of=\/dev\//i,
  /\bdrop\s+database\b/i,
  /\bchmod\s+-R\s+777\s+\//i,
];

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const READ_ONLY_PATTERNS = [
  /^journalctl\b/i,
  /^tail\b/i,
  /^grep\b/i,
  /^cat\s+\/var\/log\//i,
  /^systemctl\s+status\b/i,
  /^curl\s+-I\b/i,
];

// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function normalize(command) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return String(command || "").trim();
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function classifyCommandRisk(command) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const normalized = normalize(command);
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!normalized) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return { status: "blocked", reason: "empty-command", approvalRequired: false };
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (BLOCK_PATTERNS.some((pattern) => pattern.test(normalized))) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return { status: "blocked", reason: "catastrophic-command", approvalRequired: false };
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (READ_ONLY_PATTERNS.some((pattern) => pattern.test(normalized))) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return { status: "dry-run-ready", reason: "read-only-command", approvalRequired: false };
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (/^(systemctl|supervisorctl)\s+(restart|stop|start)\b/i.test(normalized)) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return { status: "pending-approval", reason: "service-lifecycle-change", approvalRequired: true };
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (/\b(mysql|mongo|psql)\b/i.test(normalized)) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return { status: "pending-approval", reason: "database-command", approvalRequired: true };
  }
  // 返回结果：调用方会拿到这个值继续后续流程。
  return { status: "pending-review", reason: "unknown-command-shape", approvalRequired: true };
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function buildRemoteExecutionPlan(request = {}) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const command = normalize(request.command ?? "journalctl -u gpmm_backend -n 100");
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const target = request.target ?? "sit-gpmm-backend-01";
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const user = request.user ?? "tome";
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const classification = classifyCommandRisk(command);
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 48,
    title: "安全远程执行审批 Agent",
    localOnly: true,
    target,
    user,
    command,
    status: classification.status,
    reason: classification.reason,
    dryRun: true,
    approvalRequired: classification.approvalRequired,
    verificationLayers: ["cli-preflight", "backend-policy", "audit-log"],
    approvalSummary: classification.status === "blocked"
      ? "命令风险过高，不进入审批。"
      : `用户 ${user} 请求在 ${target} 执行: ${command}`,
    rollback: classification.approvalRequired
      ? ["记录变更前状态", "准备服务恢复命令", "确认健康检查和日志回退信号"]
      : [],
    audit: {
      executed: false,
      commandHash: Buffer.from(command).toString("base64"),
      note: "教学 dry-run，不执行 SSH/SCP/systemctl。",
    },
  };
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo() {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    safeRead: buildRemoteExecutionPlan({ command: "journalctl -u gpmm_backend -n 100" }),
    approval: buildRemoteExecutionPlan({ command: "systemctl restart gpmm_backend" }),
    blocked: buildRemoteExecutionPlan({ command: "rm -rf /" }),
  };
}
