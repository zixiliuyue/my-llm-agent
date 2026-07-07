/**
 * Day 67：Human-in-the-Loop 审批闭环。
 *
 * 学习目标：实现“敏感操作前暂停 -> 通知用户 -> 接收 webhook 决策 -> 继续或回滚”的完整状态机。
 * 默认只使用内存通知和 webhook payload，不发送真实 Slack/邮件。
 */

const DEFAULT_NOW = "2026-05-25T10:00:00.000Z";

function createId(prefix, count) {
  return `${prefix}-${String(count).padStart(4, "0")}`;
}

/** 创建 HITL workflow；真实系统可把通知器替换成 Slack/邮件/WebSocket。 */
export function createHumanLoopWorkflow({ now = () => DEFAULT_NOW, notifier = createMemoryNotifier() } = {}) {
  const runs = new Map();
  const approvals = new Map();
  const counters = { run: 0, approval: 0 };

  return {
    createRun({ goal, actor = "user" }) {
      const run = {
        id: createId("run", ++counters.run),
        goal,
        actor,
        status: "running",
        createdAt: now(),
        timeline: [{ at: now(), type: "run.created", message: goal }],
      };
      runs.set(run.id, run);
      return run;
    },

    requestApproval(runId, action) {
      const run = this.getRun(runId);
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
      return approval;
    },

    handleWebhookDecision(payload) {
      const approval = approvals.get(payload.approvalId);
      if (!approval) throw new Error(`approval ${payload.approvalId} 不存在`);
      if (approval.status !== "pending") throw new Error(`approval ${approval.id} 已处理`);
      const run = this.getRun(approval.runId);
      approval.status = payload.decision;
      approval.decidedBy = payload.decidedBy;
      approval.decidedAt = now();
      approval.reason = payload.reason || "";
      run.timeline.push({ at: now(), type: "approval.decided", message: `${payload.decision} by ${payload.decidedBy}` });
      if (payload.decision === "approved") {
        run.status = "resumed";
        run.timeline.push({ at: now(), type: "run.resumed", message: "人工批准后继续执行" });
      } else {
        run.status = "rollback-required";
        run.timeline.push({ at: now(), type: "run.rollback", message: "人工拒绝后进入回滚路径" });
      }
      return { approval, run };
    },

    getRun(runId) {
      const run = runs.get(runId);
      if (!run) throw new Error(`run ${runId} 不存在`);
      return run;
    },

    listNotifications() {
      return notifier.messages();
    },
  };
}

/** 内存通知器：模拟 Slack/邮件/Web 通知，便于测试验证 payload。 */
export function createMemoryNotifier() {
  const sent = [];
  return {
    notify(message) {
      sent.push({ ...message, sentAt: DEFAULT_NOW });
      return sent.at(-1);
    },
    messages() {
      return [...sent];
    },
  };
}

/** 生成 webhook 决策 payload；真实系统还应签名校验和防重放。 */
export function createDecisionPayload(approvalId, decision, decidedBy, reason = "") {
  return {
    approvalId,
    decision,
    decidedBy,
    reason,
    signature: `mock-signature:${approvalId}:${decision}`,
  };
}

/** 校验 webhook payload 结构；签名这里只做教学级 mock。 */
export function validateDecisionPayload(payload) {
  const errors = [];
  if (!payload.approvalId) errors.push("approvalId required");
  if (!["approved", "rejected"].includes(payload.decision)) errors.push("decision invalid");
  if (!payload.decidedBy) errors.push("decidedBy required");
  if (payload.signature !== `mock-signature:${payload.approvalId}:${payload.decision}`) errors.push("signature invalid");
  return { ok: errors.length === 0, errors };
}

/** CLI demo：一条批准继续，一条拒绝回滚。 */
export function runDemo() {
  const workflow = createHumanLoopWorkflow();
  const approvedRun = workflow.createRun({ goal: "重启 agent worker 前请求审批" });
  const approval = workflow.requestApproval(approvedRun.id, { summary: "dry-run 重启 agent worker", channel: "webhook" });
  const approved = workflow.handleWebhookDecision(createDecisionPayload(approval.id, "approved", "lead@example.com", "允许 dry-run"));
  const rejectedRun = workflow.createRun({ goal: "执行数据库修复前请求审批" });
  const rejectedApproval = workflow.requestApproval(rejectedRun.id, { summary: "执行 UPDATE 修复 SQL", channel: "webhook" });
  const rejected = workflow.handleWebhookDecision(createDecisionPayload(rejectedApproval.id, "rejected", "dba@example.com", "缺少备份"));
  return {
    day: 67,
    title: "human-loop",
    localOnly: true,
    notifications: workflow.listNotifications(),
    approved: approved.run,
    rejected: rejected.run,
  };
}
