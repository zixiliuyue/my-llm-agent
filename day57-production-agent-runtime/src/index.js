/**
 * Day 57：自包含学习源码。
 *
 * 这个文件属于 day57-production-agent-runtime，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：用内存 adapter 表达生产级 Agent Runtime 的持久化、租约、取消、重试、超时和恢复。

const DEFAULT_NOW = "2026-05-25T10:00:00.000Z";

function clone(value) {
  // 处理 JSON：把对象和字符串互相转换，便于协议传输或断言。
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix, count) {
  return `${prefix}-${String(count).padStart(4, "0")}`;
}

export function createRuntime({ now = DEFAULT_NOW, maxConcurrentRuns = 1, leaseMs = 30_000 } = {}) {
  const state = {
    now,
    maxConcurrentRuns,
    leaseMs,
    sessions: new Map(),
    runs: new Map(),
    idempotency: new Map(),
    audit: [],
    counters: { session: 0, run: 0, toolCall: 0, evidence: 0 },
  };

  function snapshot() {
    return {
      sessions: [...state.sessions.values()].map(clone),
      runs: [...state.runs.values()].map(clone),
      audit: clone(state.audit),
    };
  }

  function log(type, detail) {
    // 更新状态：这里会改变前面定义的变量或对象字段。
    state.audit.push({ time: state.now, type, detail });
  }

  function createSession({ userId, projectId }) {
    const id = createId("ses", ++state.counters.session);
    const session = { id, userId, projectId, createdAt: state.now, status: "active" };
    // 更新状态：这里会改变前面定义的变量或对象字段。
    state.sessions.set(id, session);
    // 调用函数：把当前数据交给已有逻辑处理。
    log("session.created", { id, userId, projectId });
    return clone(session);
  }

  function createRun({ sessionId, input, idempotencyKey, timeoutMs = 60_000 }) {
    if (!state.sessions.has(sessionId)) throw new Error("session not found");
    if (idempotencyKey && state.idempotency.has(idempotencyKey)) {
      return clone(state.runs.get(state.idempotency.get(idempotencyKey)));
    }
    const id = createId("run", ++state.counters.run);
    const run = {
      id,
      sessionId,
      input,
      idempotencyKey,
      timeoutMs,
      status: "queued",
      attempt: 0,
      lease: null,
      toolCalls: [],
      evidence: [],
      createdAt: state.now,
      updatedAt: state.now,
      result: null,
      error: null,
    };
    // 更新状态：这里会改变前面定义的变量或对象字段。
    state.runs.set(id, run);
    if (idempotencyKey) state.idempotency.set(idempotencyKey, id);
    // 调用函数：把当前数据交给已有逻辑处理。
    log("run.created", { id, sessionId });
    return clone(run);
  }

  function activeRunningCount() {
    return [...state.runs.values()].filter((run) => run.status === "running").length;
  }

  function leaseRun(workerId) {
    if (activeRunningCount() >= state.maxConcurrentRuns) return null;
    const run = [...state.runs.values()].find((item) => item.status === "queued" || item.status === "retry_waiting");
    if (!run) return null;
    // 更新状态：这里会改变前面定义的变量或对象字段。
    run.status = "running";
    // 更新状态：这里会改变前面定义的变量或对象字段。
    run.attempt += 1;
    // 更新状态：这里会改变前面定义的变量或对象字段。
    run.lease = { workerId, acquiredAt: state.now, expiresAt: new Date(Date.parse(state.now) + state.leaseMs).toISOString() };
    // 更新状态：这里会改变前面定义的变量或对象字段。
    run.updatedAt = state.now;
    // 调用函数：把当前数据交给已有逻辑处理。
    log("run.leased", { id: run.id, workerId });
    return clone(run);
  }

  function recordToolCall(runId, { name, input, output, status = "succeeded" }) {
    const run = state.runs.get(runId);
    if (!run) throw new Error("run not found");
    const call = { id: createId("tool", ++state.counters.toolCall), runId, name, input, output, status, time: state.now };
    // 更新状态：这里会改变前面定义的变量或对象字段。
    run.toolCalls.push(call);
    // 调用函数：把当前数据交给已有逻辑处理。
    log("tool_call.recorded", { runId, name, status });
    return clone(call);
  }

  function appendEvidence(runId, evidence) {
    const run = state.runs.get(runId);
    if (!run) throw new Error("run not found");
    const record = { id: createId("ev", ++state.counters.evidence), runId, ...evidence, time: state.now };
    // 更新状态：这里会改变前面定义的变量或对象字段。
    run.evidence.push(record);
    return clone(record);
  }

  function completeRun(runId, result) {
    const run = state.runs.get(runId);
    if (!run) throw new Error("run not found");
    // 更新状态：这里会改变前面定义的变量或对象字段。
    run.status = "succeeded";
    // 更新状态：这里会改变前面定义的变量或对象字段。
    run.result = result;
    // 更新状态：这里会改变前面定义的变量或对象字段。
    run.lease = null;
    // 调用函数：把当前数据交给已有逻辑处理。
    log("run.completed", { runId });
    return clone(run);
  }

  function cancelRun(runId, reason = "user_cancelled") {
    const run = state.runs.get(runId);
    if (!run) throw new Error("run not found");
    // 更新状态：这里会改变前面定义的变量或对象字段。
    run.status = "cancelled";
    // 更新状态：这里会改变前面定义的变量或对象字段。
    run.error = reason;
    // 更新状态：这里会改变前面定义的变量或对象字段。
    run.lease = null;
    // 调用函数：把当前数据交给已有逻辑处理。
    log("run.cancelled", { runId, reason });
    return clone(run);
  }

  function markTimeouts(nowIso) {
    // 更新状态：这里会改变前面定义的变量或对象字段。
    state.now = nowIso;
    let count = 0;
    for (const run of state.runs.values()) {
      const expired = run.status === "running" && Date.parse(nowIso) - Date.parse(run.updatedAt) >= run.timeoutMs;
      if (expired) {
        // 更新状态：这里会改变前面定义的变量或对象字段。
        run.status = "timed_out";
        // 更新状态：这里会改变前面定义的变量或对象字段。
        run.error = "timeout";
        // 更新状态：这里会改变前面定义的变量或对象字段。
        run.lease = null;
        // 更新状态：这里会改变前面定义的变量或对象字段。
        count += 1;
      }
    }
    // 调用函数：把当前数据交给已有逻辑处理。
    log("runtime.timeout_scan", { count });
    return count;
  }

  function retryRun(runId) {
    const run = state.runs.get(runId);
    if (!run) throw new Error("run not found");
    if (!["failed", "timed_out"].includes(run.status)) throw new Error("run is not retryable");
    // 更新状态：这里会改变前面定义的变量或对象字段。
    run.status = "retry_waiting";
    // 更新状态：这里会改变前面定义的变量或对象字段。
    run.error = null;
    // 调用函数：把当前数据交给已有逻辑处理。
    log("run.retry_scheduled", { runId });
    return clone(run);
  }

  function recoverExpiredLeases(nowIso) {
    // 更新状态：这里会改变前面定义的变量或对象字段。
    state.now = nowIso;
    let recovered = 0;
    for (const run of state.runs.values()) {
      if (run.status === "running" && run.lease && Date.parse(run.lease.expiresAt) <= Date.parse(nowIso)) {
        // 更新状态：这里会改变前面定义的变量或对象字段。
        run.status = "queued";
        // 更新状态：这里会改变前面定义的变量或对象字段。
        run.lease = null;
        // 更新状态：这里会改变前面定义的变量或对象字段。
        recovered += 1;
      }
    }
    // 调用函数：把当前数据交给已有逻辑处理。
    log("runtime.recovered", { recovered });
    return recovered;
  }

  return {
    createSession,
    createRun,
    leaseRun,
    recordToolCall,
    appendEvidence,
    completeRun,
    cancelRun,
    markTimeouts,
    retryRun,
    recoverExpiredLeases,
    snapshot,
  };
}

export function runDemo() {
  const runtime = createRuntime({ maxConcurrentRuns: 1 });
  const session = runtime.createSession({ userId: "tome", projectId: "agent-platform" });
  const run = runtime.createRun({ sessionId: session.id, input: "诊断接口变慢", idempotencyKey: "demo-001" });
  const leased = runtime.leaseRun("worker-a");
  // 调用函数：把当前数据交给已有逻辑处理。
  runtime.recordToolCall(leased.id, { name: "query_metrics", input: { service: "api" }, output: { p95: 880 } });
  // 调用函数：把当前数据交给已有逻辑处理。
  runtime.appendEvidence(leased.id, { source: "metrics", text: "p95=880ms" });
  const completed = runtime.completeRun(leased.id, { answer: "需要人工审查慢查询。" });
  return {
    day: 57,
    title: "Production Agent Runtime",
    localOnly: true,
    interfaces: ["api", "worker", "storage", "redis-like-lease"],
    session,
    run,
    completed,
    snapshot: runtime.snapshot(),
    dockerCompose: "docker compose -f day57-production-agent-runtime/docker-compose.yml up --build",
  };
}
