/**
 * Day 43：自包含学习源码。
 *
 * 这个文件属于 day43-remote-command-approval，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：把远程命令执行拆成风险识别、审批请求、dry-run 和审计，不直接执行命令。
const DANGEROUS_PATTERNS = [
  { id: "delete-root", pattern: /\brm\s+-rf\s+\/(\s|$)/ },
  { id: "format-disk", pattern: /\bmkfs\b|\bdd\b.*\bof=\/dev\// },
  { id: "permission-destroy", pattern: /\bchmod\s+-R\s+777\s+\// },
  { id: "shutdown", pattern: /\b(shutdown|reboot|poweroff)\b/ },
  { id: "drop-database", pattern: /\bdrop\s+(database|table)\b/i },
];

export function classifyCommandRisk(command) {
  const hits = DANGEROUS_PATTERNS.filter((item) => item.pattern.test(command));
  if (hits.length > 0) {
    return { level: "blocked", reasons: hits.map((item) => item.id) };
  }
  if (/\b(systemctl|supervisorctl|kubectl|ssh|scp|rsync)\b/.test(command)) {
    return { level: "approval_required", reasons: ["remote-or-service-operation"] };
  }
  return { level: "low", reasons: ["read-only-or-local-command"] };
}

export function createRemoteCommandPlan({ user, target, command, cwd = "/tmp" }) {
  const risk = classifyCommandRisk(command);
  return {
    id: `plan-${Buffer.from(`${user}:${target}:${command}`).toString("base64url").slice(0, 12)}`,
    user,
    target,
    cwd,
    command,
    risk,
    dryRun: true,
    allowedToExecute: false,
    requiredApprovals: risk.level === "low" ? [] : ["owner", "sre"],
  };
}

export function requestApproval(plan) {
  if (plan.risk.level === "blocked") {
    return {
      ok: false,
      status: "blocked",
      message: "命令命中高危规则，不生成执行审批。",
      plan,
    };
  }
  return {
    ok: true,
    status: plan.requiredApprovals.length > 0 ? "pending_approval" : "dry_run_only",
    approvers: plan.requiredApprovals,
    plan,
  };
}

// 教学项目只输出 dry-run 结果，不执行真实远程命令。
export function executeDryRun(plan) {
  return {
    ok: true,
    executed: false,
    dryRun: true,
    stdout: `[dry-run] ${plan.target}:${plan.cwd}$ ${plan.command}`,
    audit: {
      user: plan.user,
      target: plan.target,
      commandHash: plan.id,
      riskLevel: plan.risk.level,
    },
  };
}

export function runDemo() {
  const plan = createRemoteCommandPlan({
    user: "tome",
    target: "test-env-202",
    command: "journalctl -u gpmm_backend --since '10 minutes ago' --no-pager",
  });
  return {
    day: 43,
    title: "远程命令审批链",
    approval: requestApproval(plan),
    dryRun: executeDryRun(plan),
    blockedExample: requestApproval(createRemoteCommandPlan({
      user: "tome",
      target: "prod",
      command: "rm -rf /",
    })),
  };
}
