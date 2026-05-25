/**
 * Day 67：Human-in-the-Loop 审批闭环。
 *
 * 学习目标：实现“敏感操作前暂停 -> 通知用户 -> 接收 webhook 决策 -> 继续或回滚”的完整状态机。
 * 默认只使用内存通知和 webhook payload，不发送真实 Slack/邮件。
 */

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const DEFAULT_NOW = "2026-05-25T10:00:00.000Z";

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function createId(prefix, count) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return `${prefix}-${String(count).padStart(4, "0")}`;
}

/** 创建 HITL workflow；真实系统可把通知器替换成 Slack/邮件/WebSocket。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function createHumanLoopWorkflow({ now = () => DEFAULT_NOW, notifier = createMemoryNotifier() } = {}) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const runs = new Map();
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const approvals = new Map();
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const counters = { run: 0, approval: 0 };

  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    createRun({ goal, actor = "user" }) {
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const run = {
        id: createId("run", ++counters.run),
        goal,
        actor,
        status: "running",
        createdAt: now(),
        timeline: [{ at: now(), type: "run.created", message: goal }],
      };
      runs.set(run.id, run);
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return run;
    },

    requestApproval(runId, action) {
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const run = this.getRun(runId);
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const approval = {
        id: createId("approval", ++counters.approval),
        runId,
        action,
        status: "pending",
        requestedAt: now(),
        webhookPath: `/webhooks/approvals/${createId("approval", counters.approval)}`,
      };
      approvals.set(approval.id, approval);
      run.status = "waiting-human";
      run.timeline.push({ at: now(), type: "approval.requested", message: action.summary });
      notifier.notify({
        channel: action.channel || "web",
        approvalId: approval.id,
        runId,
        text: `需要审批: ${action.summary}`,
        approvePayload: createDecisionPayload(approval.id, "approved", "human@example.com"),
        rejectPayload: createDecisionPayload(approval.id, "rejected", "human@example.com"),
      });
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return approval;
    },

    handleWebhookDecision(payload) {
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const approval = approvals.get(payload.approvalId);
      // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (!approval) throw new Error(`approval ${payload.approvalId} 不存在`);
      // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (approval.status !== "pending") throw new Error(`approval ${approval.id} 已处理`);
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const run = this.getRun(approval.runId);
      approval.status = payload.decision;
      approval.decidedBy = payload.decidedBy;
      approval.decidedAt = now();
      approval.reason = payload.reason || "";
      run.timeline.push({ at: now(), type: "approval.decided", message: `${payload.decision} by ${payload.decidedBy}` });
      // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (payload.decision === "approved") {
        run.status = "resumed";
        run.timeline.push({ at: now(), type: "run.resumed", message: "人工批准后继续执行" });
      } else {
        run.status = "rollback-required";
        run.timeline.push({ at: now(), type: "run.rollback", message: "人工拒绝后进入回滚路径" });
      }
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return { approval, run };
    },

    getRun(runId) {
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const run = runs.get(runId);
      // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (!run) throw new Error(`run ${runId} 不存在`);
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return run;
    },

    listNotifications() {
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return notifier.messages();
    },
  };
}

/** 内存通知器：模拟 Slack/邮件/Web 通知，便于测试验证 payload。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function createMemoryNotifier() {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const sent = [];
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    notify(message) {
      sent.push({ ...message, sentAt: DEFAULT_NOW });
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return sent.at(-1);
    },
    messages() {
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return [...sent];
    },
  };
}

/** 生成 webhook 决策 payload；真实系统还应签名校验和防重放。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function createDecisionPayload(approvalId, decision, decidedBy, reason = "") {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    approvalId,
    decision,
    decidedBy,
    reason,
    signature: `mock-signature:${approvalId}:${decision}`,
  };
}

/** 校验 webhook payload 结构；签名这里只做教学级 mock。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function validateDecisionPayload(payload) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const errors = [];
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!payload.approvalId) errors.push("approvalId required");
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!["approved", "rejected"].includes(payload.decision)) errors.push("decision invalid");
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!payload.decidedBy) errors.push("decidedBy required");
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (payload.signature !== `mock-signature:${payload.approvalId}:${payload.decision}`) errors.push("signature invalid");
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return { ok: errors.length === 0, errors };
}

/** CLI demo：一条批准继续，一条拒绝回滚。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function runDemo() {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const workflow = createHumanLoopWorkflow();
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const approvedRun = workflow.createRun({ goal: "重启 agent worker 前请求审批" });
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const approval = workflow.requestApproval(approvedRun.id, { summary: "dry-run 重启 agent worker", channel: "webhook" });
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const approved = workflow.handleWebhookDecision(createDecisionPayload(approval.id, "approved", "lead@example.com", "允许 dry-run"));
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const rejectedRun = workflow.createRun({ goal: "执行数据库修复前请求审批" });
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const rejectedApproval = workflow.requestApproval(rejectedRun.id, { summary: "执行 UPDATE 修复 SQL", channel: "webhook" });
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const rejected = workflow.handleWebhookDecision(createDecisionPayload(rejectedApproval.id, "rejected", "dba@example.com", "缺少备份"));
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 67,
    title: "human-loop",
    localOnly: true,
    notifications: workflow.listNotifications(),
    approved: approved.run,
    rejected: rejected.run,
  };
}
