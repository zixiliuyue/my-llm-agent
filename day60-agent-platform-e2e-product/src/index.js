/**
 * Day 60：端到端可运行 Agent 产品原型。
 *
 * 学习目标：把生产 Runtime、Harness、RAG、审批和复盘串成一个最小产品闭环。默认不连真实
 * Postgres/Redis/模型，Docker Compose 作为显式演示路径，单测使用内存实现。
 */

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const DEFAULT_NOW = "2026-05-25T10:00:00.000Z";

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function createId(prefix, number) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return `${prefix}-${String(number).padStart(4, "0")}`;
}

/** 创建产品平台内存版；真实系统可把 stores 换成 API + worker + DB + Redis。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function createAgentOpsPlatform({ now = () => DEFAULT_NOW } = {}) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const runs = new Map();
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const approvals = new Map();
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const counters = { run: 0, approval: 0 };
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
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

  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    createRun({ goal, actor = "tome", tenant = "local-demo" }) {
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const runId = createId("run", ++counters.run);
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
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
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return run;
    },

    searchKnowledge(runId, query) {
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const run = this.getRun(runId);
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const terms = query.toLowerCase().split(/\W+/).filter(Boolean);
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
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
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return citations;
    },

    requestToolApproval(runId, { toolName, command, reason, risk = "medium" }) {
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const run = this.getRun(runId);
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const approvalId = createId("approval", ++counters.approval);
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
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
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return toolCall;
    },

    decideApproval(approvalId, { approved, reviewer = "human-reviewer", note = "" }) {
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const approval = approvals.get(approvalId);
      // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (!approval) throw new Error(`approval ${approvalId} 不存在`);
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const run = this.getRun(approval.runId);
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const toolCall = run.toolCalls.find((item) => item.id === approval.toolCallId);
      approval.status = approved ? "approved" : "rejected";
      approval.reviewer = reviewer;
      approval.note = note;
      approval.decidedAt = now();
      toolCall.status = approved ? "dry-run-approved" : "rejected";
      run.status = approved ? "running" : "blocked";
      run.timeline.push({ at: now(), type: "approval.decided", message: `${reviewer} ${approval.status}` });
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return approval;
    },

    appendEvidence(runId, evidence) {
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const run = this.getRun(runId);
      run.evidenceBoard.push({ id: `evidence-${run.evidenceBoard.length + 1}`, at: now(), ...evidence });
      run.timeline.push({ at: now(), type: "evidence.added", message: evidence.title });
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return run.evidenceBoard.at(-1);
    },

    completeRun(runId) {
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const run = this.getRun(runId);
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const hasApproval = run.toolCalls.every((toolCall) => toolCall.status === "dry-run-approved");
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const hasCitation = run.citations.length > 0;
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const hasEvidence = run.evidenceBoard.length > 0;
      run.status = hasApproval && hasCitation && hasEvidence ? "ready-for-human-review" : "needs-more-evidence";
      run.finalReport = {
        title: "Agent Ops Closure Report",
        status: run.status,
        summary: "已完成 RAG 引用、工具审批、证据沉淀和复盘草案，等待人工确认。",
        sections: ["timeline", "impact", "evidence", "fix", "prevention"],
      };
      run.timeline.push({ at: now(), type: "run.completed", message: run.status });
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return run.finalReport;
    },

    getRun(runId) {
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const run = runs.get(runId);
      // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (!run) throw new Error(`run ${runId} 不存在`);
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return run;
    },

    listRuns() {
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return Array.from(runs.values()).map((run) => ({
        id: run.id,
        goal: run.goal,
        status: run.status,
        toolCalls: run.toolCalls.length,
        citations: run.citations.length,
      }));
    },

    health() {
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return { ok: true, service: "day60-agent-platform", time: now() };
    },

    metrics() {
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const allRuns = Array.from(runs.values());
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return {
        runsTotal: allRuns.length,
        waitingApproval: allRuns.filter((run) => run.status === "waiting-approval").length,
        readyForReview: allRuns.filter((run) => run.status === "ready-for-human-review").length,
      };
    },
  };
}

/** 运行完整产品闭环：用户输入 -> run -> RAG -> approval -> evidence -> final report。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function runProductDemo() {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const platform = createAgentOpsPlatform();
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const run = platform.createRun({ goal: "诊断 agent run 卡在工具调用审批的原因" });
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const citations = platform.searchKnowledge(run.id, "agent risky tool approval evidence");
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
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
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const finalReport = platform.completeRun(run.id);

  // 教学：返回结果：调用方会拿到这个值继续后续流程。
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
