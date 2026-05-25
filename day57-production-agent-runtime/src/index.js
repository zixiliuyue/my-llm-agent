/**
 * Day 57：自包含学习源码。
 *
 * 这个文件属于 day57-production-agent-runtime，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：用内存 adapter 表达生产级 Agent Runtime 的持久化、租约、取消、重试、超时和恢复。

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const DEFAULT_NOW = "2026-05-25T10:00:00.000Z";

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function clone(value) {
  // 教学：处理 JSON：把对象和字符串互相转换，便于协议传输或断言。
  return JSON.parse(JSON.stringify(value));
}

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function createId(prefix, count) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return `${prefix}-${String(count).padStart(4, "0")}`;
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createRuntime({ now = DEFAULT_NOW, maxConcurrentRuns = 1, leaseMs = 30_000 } = {}) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
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

  // 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
  function snapshot() {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return {
      sessions: [...state.sessions.values()].map(clone),
      runs: [...state.runs.values()].map(clone),
      audit: clone(state.audit),
    };
  }

  // 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
  function log(type, detail) {
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    state.audit.push({ time: state.now, type, detail });
  }

  // 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
  function createSession({ userId, projectId }) {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const id = createId("ses", ++state.counters.session);
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const session = { id, userId, projectId, createdAt: state.now, status: "active" };
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    state.sessions.set(id, session);
    // 教学：调用函数：把当前数据交给已有逻辑处理。
    log("session.created", { id, userId, projectId });
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return clone(session);
  }

  // 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
  function createRun({ sessionId, input, idempotencyKey, timeoutMs = 60_000 }) {
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!state.sessions.has(sessionId)) throw new Error("session not found");
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (idempotencyKey && state.idempotency.has(idempotencyKey)) {
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return clone(state.runs.get(state.idempotency.get(idempotencyKey)));
    }
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const id = createId("run", ++state.counters.run);
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
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
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    state.runs.set(id, run);
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (idempotencyKey) state.idempotency.set(idempotencyKey, id);
    // 教学：调用函数：把当前数据交给已有逻辑处理。
    log("run.created", { id, sessionId });
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return clone(run);
  }

  // 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
  function activeRunningCount() {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return [...state.runs.values()].filter((run) => run.status === "running").length;
  }

  // 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
  function leaseRun(workerId) {
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (activeRunningCount() >= state.maxConcurrentRuns) return null;
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const run = [...state.runs.values()].find((item) => item.status === "queued" || item.status === "retry_waiting");
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!run) return null;
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    run.status = "running";
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    run.attempt += 1;
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    run.lease = { workerId, acquiredAt: state.now, expiresAt: new Date(Date.parse(state.now) + state.leaseMs).toISOString() };
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    run.updatedAt = state.now;
    // 教学：调用函数：把当前数据交给已有逻辑处理。
    log("run.leased", { id: run.id, workerId });
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return clone(run);
  }

  // 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
  function recordToolCall(runId, { name, input, output, status = "succeeded" }) {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const run = state.runs.get(runId);
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!run) throw new Error("run not found");
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const call = { id: createId("tool", ++state.counters.toolCall), runId, name, input, output, status, time: state.now };
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    run.toolCalls.push(call);
    // 教学：调用函数：把当前数据交给已有逻辑处理。
    log("tool_call.recorded", { runId, name, status });
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return clone(call);
  }

  // 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
  function appendEvidence(runId, evidence) {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const run = state.runs.get(runId);
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!run) throw new Error("run not found");
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const record = { id: createId("ev", ++state.counters.evidence), runId, ...evidence, time: state.now };
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    run.evidence.push(record);
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return clone(record);
  }

  // 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
  function completeRun(runId, result) {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const run = state.runs.get(runId);
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!run) throw new Error("run not found");
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    run.status = "succeeded";
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    run.result = result;
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    run.lease = null;
    // 教学：调用函数：把当前数据交给已有逻辑处理。
    log("run.completed", { runId });
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return clone(run);
  }

  // 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
  function cancelRun(runId, reason = "user_cancelled") {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const run = state.runs.get(runId);
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!run) throw new Error("run not found");
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    run.status = "cancelled";
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    run.error = reason;
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    run.lease = null;
    // 教学：调用函数：把当前数据交给已有逻辑处理。
    log("run.cancelled", { runId, reason });
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return clone(run);
  }

  // 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
  function markTimeouts(nowIso) {
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    state.now = nowIso;
    // 教学：定义变量：这个值后面会被更新，所以使用 let。
    let count = 0;
    // 教学：循环：按顺序处理多条数据或多个步骤。
    for (const run of state.runs.values()) {
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const expired = run.status === "running" && Date.parse(nowIso) - Date.parse(run.updatedAt) >= run.timeoutMs;
      // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (expired) {
        // 教学：更新状态：这里会改变前面定义的变量或对象字段。
        run.status = "timed_out";
        // 教学：更新状态：这里会改变前面定义的变量或对象字段。
        run.error = "timeout";
        // 教学：更新状态：这里会改变前面定义的变量或对象字段。
        run.lease = null;
        // 教学：更新状态：这里会改变前面定义的变量或对象字段。
        count += 1;
      }
    }
    // 教学：调用函数：把当前数据交给已有逻辑处理。
    log("runtime.timeout_scan", { count });
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return count;
  }

  // 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
  function retryRun(runId) {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const run = state.runs.get(runId);
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!run) throw new Error("run not found");
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!["failed", "timed_out"].includes(run.status)) throw new Error("run is not retryable");
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    run.status = "retry_waiting";
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    run.error = null;
    // 教学：调用函数：把当前数据交给已有逻辑处理。
    log("run.retry_scheduled", { runId });
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return clone(run);
  }

  // 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
  function recoverExpiredLeases(nowIso) {
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    state.now = nowIso;
    // 教学：定义变量：这个值后面会被更新，所以使用 let。
    let recovered = 0;
    // 教学：循环：按顺序处理多条数据或多个步骤。
    for (const run of state.runs.values()) {
      // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (run.status === "running" && run.lease && Date.parse(run.lease.expiresAt) <= Date.parse(nowIso)) {
        // 教学：更新状态：这里会改变前面定义的变量或对象字段。
        run.status = "queued";
        // 教学：更新状态：这里会改变前面定义的变量或对象字段。
        run.lease = null;
        // 教学：更新状态：这里会改变前面定义的变量或对象字段。
        recovered += 1;
      }
    }
    // 教学：调用函数：把当前数据交给已有逻辑处理。
    log("runtime.recovered", { recovered });
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return recovered;
  }

  // 教学：返回结果：调用方会拿到这个值继续后续流程。
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

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo() {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const runtime = createRuntime({ maxConcurrentRuns: 1 });
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const session = runtime.createSession({ userId: "tome", projectId: "agent-platform" });
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const run = runtime.createRun({ sessionId: session.id, input: "诊断接口变慢", idempotencyKey: "demo-001" });
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const leased = runtime.leaseRun("worker-a");
  // 教学：调用函数：把当前数据交给已有逻辑处理。
  runtime.recordToolCall(leased.id, { name: "query_metrics", input: { service: "api" }, output: { p95: 880 } });
  // 教学：调用函数：把当前数据交给已有逻辑处理。
  runtime.appendEvidence(leased.id, { source: "metrics", text: "p95=880ms" });
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const completed = runtime.completeRun(leased.id, { answer: "需要人工审查慢查询。" });
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
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
