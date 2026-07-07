/**
 * Day 60：端到端可运行 Agent 产品原型。
 *
 * 学习目标：把生产 Runtime、Harness、RAG、审批和复盘串成一个最小产品闭环。默认不连真实
 * Postgres/Redis/模型，Docker Compose 作为显式演示路径，单测使用内存实现。
 */

const DEFAULT_NOW = "2026-05-25T10:00:00.000Z";

function createId(prefix, number) {
  return `${prefix}-${String(number).padStart(4, "0")}`;
}

/** 创建产品平台内存版；真实系统可把 stores 换成 API + worker + DB + Redis。 */
export function createAgentOpsPlatform({ now = () => DEFAULT_NOW } = {}) {
  const runs = new Map();
  const approvals = new Map();
  const counters = { run: 0, approval: 0 };
  const ragDocs = [
    {
      id: "runtime-runbook",
      title: "Runtime Runbook",
      content: "When an agent run calls a risky tool, pause for human approval and record evidence.",
    },
    {
      id: "incident-template",
      title: "Incident Report Template",
      content: "Final report must include timeline, impact, evidence, fix and prevention.",
    },
  ];

  return {
    createRun({ goal, actor = "tome", tenant = "local-demo" }) {
      const runId = createId("run", ++counters.run);
      const run = {
        id: runId,
        goal,
        actor,
        tenant,
        status: "queued",
        createdAt: now(),
        timeline: [{ at: now(), type: "run.created", message: "用户提交目标" }],
        toolCalls: [],
        citations: [],
        evidenceBoard: [],
        finalReport: null,
      };
      runs.set(runId, run);
      return run;
    },

    searchKnowledge(runId, query) {
      const run = this.getRun(runId);
      const terms = query.toLowerCase().split(/\W+/).filter(Boolean);
      const citations = ragDocs
        .map((doc) => ({
          documentId: doc.id,
          title: doc.title,
          score: terms.filter((term) => doc.content.toLowerCase().includes(term)).length,
          quote: doc.content,
        }))
        .filter((item) => item.score > 0)
        .sort((left, right) => right.score - left.score);
      run.citations = citations;
      run.timeline.push({ at: now(), type: "rag.search", message: `找到 ${citations.length} 条引用` });
      return citations;
    },

    requestToolApproval(runId, { toolName, command, reason, risk = "medium" }) {
      const run = this.getRun(runId);
      const approvalId = createId("approval", ++counters.approval);
      const toolCall = {
        id: `tool-${run.toolCalls.length + 1}`,
        toolName,
        command,
        reason,
        risk,
        status: "pending-approval",
        approvalId,
        executableByAgent: false,
      };
      approvals.set(approvalId, { id: approvalId, runId, status: "pending", requestedAt: now(), toolCallId: toolCall.id });
      run.toolCalls.push(toolCall);
      run.status = "waiting-approval";
      run.timeline.push({ at: now(), type: "approval.requested", message: `${toolName} 等待人工审批` });
      return toolCall;
    },

    decideApproval(approvalId, { approved, reviewer = "human-reviewer", note = "" }) {
      const approval = approvals.get(approvalId);
      if (!approval) throw new Error(`approval ${approvalId} 不存在`);
      const run = this.getRun(approval.runId);
      const toolCall = run.toolCalls.find((item) => item.id === approval.toolCallId);
      approval.status = approved ? "approved" : "rejected";
      approval.reviewer = reviewer;
      approval.note = note;
      approval.decidedAt = now();
      toolCall.status = approved ? "dry-run-approved" : "rejected";
      run.status = approved ? "running" : "blocked";
      run.timeline.push({ at: now(), type: "approval.decided", message: `${reviewer} ${approval.status}` });
      return approval;
    },

    appendEvidence(runId, evidence) {
      const run = this.getRun(runId);
      run.evidenceBoard.push({ id: `evidence-${run.evidenceBoard.length + 1}`, at: now(), ...evidence });
      run.timeline.push({ at: now(), type: "evidence.added", message: evidence.title });
      return run.evidenceBoard.at(-1);
    },

    completeRun(runId) {
      const run = this.getRun(runId);
      const hasApproval = run.toolCalls.every((toolCall) => toolCall.status === "dry-run-approved");
      const hasCitation = run.citations.length > 0;
      const hasEvidence = run.evidenceBoard.length > 0;
      run.status = hasApproval && hasCitation && hasEvidence ? "ready-for-human-review" : "needs-more-evidence";
      run.finalReport = {
        title: "Agent Ops Closure Report",
        status: run.status,
        summary: "已完成 RAG 引用、工具审批、证据沉淀和复盘草案，等待人工确认。",
        sections: ["timeline", "impact", "evidence", "fix", "prevention"],
      };
      run.timeline.push({ at: now(), type: "run.completed", message: run.status });
      return run.finalReport;
    },

    getRun(runId) {
      const run = runs.get(runId);
      if (!run) throw new Error(`run ${runId} 不存在`);
      return run;
    },

    listRuns() {
      return Array.from(runs.values()).map((run) => ({
        id: run.id,
        goal: run.goal,
        status: run.status,
        toolCalls: run.toolCalls.length,
        citations: run.citations.length,
      }));
    },

    health() {
      return { ok: true, service: "day60-agent-platform", time: now() };
    },

    metrics() {
      const allRuns = Array.from(runs.values());
      return {
        runsTotal: allRuns.length,
        waitingApproval: allRuns.filter((run) => run.status === "waiting-approval").length,
        readyForReview: allRuns.filter((run) => run.status === "ready-for-human-review").length,
      };
    },
  };
}

/** 运行完整产品闭环：用户输入 -> run -> RAG -> approval -> evidence -> final report。 */
export function runProductDemo() {
  const platform = createAgentOpsPlatform();
  const run = platform.createRun({ goal: "诊断 agent run 卡在工具调用审批的原因" });
  const citations = platform.searchKnowledge(run.id, "agent risky tool approval evidence");
  const toolCall = platform.requestToolApproval(run.id, {
    toolName: "remote.shell.dryRun",
    command: "systemctl status agent-worker",
    reason: "需要确认 worker 是否卡住；默认 dry-run，不真实执行远程命令。",
  });
  platform.decideApproval(toolCall.approvalId, { approved: true, note: "允许 dry-run 级别检查" });
  platform.appendEvidence(run.id, {
    title: "worker dry-run output",
    source: "mock-worker",
    content: "agent-worker active; queue lag 0; last heartbeat 3s ago",
  });
  const finalReport = platform.completeRun(run.id);

  return {
    day: 60,
    title: "agent-platform-e2e-product",
    localOnly: true,
    openapi: "openapi.yaml",
    health: platform.health(),
    metrics: platform.metrics(),
    runs: platform.listRuns(),
    selectedRun: platform.getRun(run.id),
    citations,
    finalReport,
  };
}
