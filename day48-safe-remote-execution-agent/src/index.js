/**
 * Day 48：自包含学习源码。
 *
 * 这个文件属于 day48-safe-remote-execution-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：把远程命令请求拆成风险判断、审批摘要、dry-run 和回滚建议。
const BLOCK_PATTERNS = [
  /\brm\s+-rf\s+\/(?:\s|$)/i,
  /\bmkfs\b/i,
  /\bdd\s+if=.*\s+of=\/dev\//i,
  /\bdrop\s+database\b/i,
  /\bchmod\s+-R\s+777\s+\//i,
];

const READ_ONLY_PATTERNS = [
  /^journalctl\b/i,
  /^tail\b/i,
  /^grep\b/i,
  /^cat\s+\/var\/log\//i,
  /^systemctl\s+status\b/i,
  /^curl\s+-I\b/i,
];

function normalize(command) {
  return String(command || "").trim();
}

export function classifyCommandRisk(command) {
  const normalized = normalize(command);
  if (!normalized) {
    return { status: "blocked", reason: "empty-command", approvalRequired: false };
  }
  if (BLOCK_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { status: "blocked", reason: "catastrophic-command", approvalRequired: false };
  }
  if (READ_ONLY_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { status: "dry-run-ready", reason: "read-only-command", approvalRequired: false };
  }
  if (/^(systemctl|supervisorctl)\s+(restart|stop|start)\b/i.test(normalized)) {
    return { status: "pending-approval", reason: "service-lifecycle-change", approvalRequired: true };
  }
  if (/\b(mysql|mongo|psql)\b/i.test(normalized)) {
    return { status: "pending-approval", reason: "database-command", approvalRequired: true };
  }
  return { status: "pending-review", reason: "unknown-command-shape", approvalRequired: true };
}

export function buildRemoteExecutionPlan(request = {}) {
  const command = normalize(request.command ?? "journalctl -u gpmm_backend -n 100");
  const target = request.target ?? "sit-gpmm-backend-01";
  const user = request.user ?? "tome";
  const classification = classifyCommandRisk(command);
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

export function runDemo() {
  return {
    safeRead: buildRemoteExecutionPlan({ command: "journalctl -u gpmm_backend -n 100" }),
    approval: buildRemoteExecutionPlan({ command: "systemctl restart gpmm_backend" }),
    blocked: buildRemoteExecutionPlan({ command: "rm -rf /" }),
  };
}
