/**
 * Day 43：自包含学习源码。
 *
 * 这个文件属于 day43-remote-command-approval，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：把远程命令执行拆成风险识别、审批请求、dry-run 和审计，不直接执行命令。
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const DANGEROUS_PATTERNS = [
  { id: "delete-root", pattern: /\brm\s+-rf\s+\/(\s|$)/ },
  { id: "format-disk", pattern: /\bmkfs\b|\bdd\b.*\bof=\/dev\// },
  { id: "permission-destroy", pattern: /\bchmod\s+-R\s+777\s+\// },
  { id: "shutdown", pattern: /\b(shutdown|reboot|poweroff)\b/ },
  { id: "drop-database", pattern: /\bdrop\s+(database|table)\b/i },
];

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function classifyCommandRisk(command) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const hits = DANGEROUS_PATTERNS.filter((item) => item.pattern.test(command));
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (hits.length > 0) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return { level: "blocked", reasons: hits.map((item) => item.id) };
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (/\b(systemctl|supervisorctl|kubectl|ssh|scp|rsync)\b/.test(command)) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return { level: "approval_required", reasons: ["remote-or-service-operation"] };
  }
  // 返回结果：调用方会拿到这个值继续后续流程。
  return { level: "low", reasons: ["read-only-or-local-command"] };
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createRemoteCommandPlan({ user, target, command, cwd = "/tmp" }) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const risk = classifyCommandRisk(command);
  // 返回结果：调用方会拿到这个值继续后续流程。
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

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function requestApproval(plan) {
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (plan.risk.level === "blocked") {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return {
      ok: false,
      status: "blocked",
      message: "命令命中高危规则，不生成执行审批。",
      plan,
    };
  }
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    ok: true,
    status: plan.requiredApprovals.length > 0 ? "pending_approval" : "dry_run_only",
    approvers: plan.requiredApprovals,
    plan,
  };
}

// 教学项目只输出 dry-run 结果，不执行真实远程命令。
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function executeDryRun(plan) {
  // 返回结果：调用方会拿到这个值继续后续流程。
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

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo() {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const plan = createRemoteCommandPlan({
    user: "tome",
    target: "test-env-202",
    command: "journalctl -u gpmm_backend --since '10 minutes ago' --no-pager",
  });
  // 返回结果：调用方会拿到这个值继续后续流程。
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
