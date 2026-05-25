/**
 * Day 69：完整可观测性堆栈教学版。
 *
 * 学习目标：把结构化日志、Prometheus 指标和 OpenTelemetry/Jaeger trace 统一接入 Agent
 * runtime。默认使用内存 exporter，不启动 Jaeger 或 Prometheus。
 */

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const DEFAULT_NOW = "2026-05-25T10:00:00.000Z";

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function createTraceId(seed) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return `trace-${Buffer.from(seed).toString("hex").slice(0, 16)}`;
}

/** 创建内存可观测性 SDK，模拟 OTel tracer、logger 和 meter。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function createObservability({ serviceName = "agent-runtime", now = () => DEFAULT_NOW } = {}) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const logs = [];
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const spans = [];
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const counters = new Map();
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const histograms = new Map();

  // 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
  function log(level, message, fields = {}) {
    logs.push({ ts: now(), level, serviceName, message, ...fields });
  }

  // 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
  function increment(name, labels = {}, value = 1) {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const key = JSON.stringify({ name, labels });
    counters.set(key, (counters.get(key) || 0) + value);
  }

  // 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
  function observe(name, labels = {}, value) {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const key = JSON.stringify({ name, labels });
    histograms.set(key, [...(histograms.get(key) || []), value]);
  }

  // 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
  function startSpan(name, attributes = {}) {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const span = {
      traceId: attributes.traceId || createTraceId(`${name}:${spans.length + 1}`),
      spanId: `span-${spans.length + 1}`,
      parentSpanId: attributes.parentSpanId || null,
      name,
      serviceName,
      startTime: now(),
      endTime: null,
      status: "unset",
      attributes,
      events: [],
    };
    spans.push(span);
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return {
      span,
      addEvent(eventName, eventAttributes = {}) {
        span.events.push({ name: eventName, at: now(), attributes: eventAttributes });
      },
      end(status = "ok") {
        span.endTime = now();
        span.status = status;
      },
    };
  }

  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    log,
    increment,
    observe,
    startSpan,
    logs: () => [...logs],
    spans: () => [...spans],
    prometheus: () => renderPrometheus(counters, histograms),
    jaeger: () => renderJaeger(serviceName, spans),
  };
}

/** 渲染 Prometheus exposition 文本。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function renderPrometheus(counters, histograms) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const lines = [];
  // 教学：循环：按顺序处理多条数据或多个步骤。
  for (const [key, value] of counters.entries()) {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const { name, labels } = JSON.parse(key);
    lines.push(`${name}${formatLabels(labels)} ${value}`);
  }
  // 教学：循环：按顺序处理多条数据或多个步骤。
  for (const [key, values] of histograms.entries()) {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const { name, labels } = JSON.parse(key);
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const sum = values.reduce((total, value) => total + value, 0);
    lines.push(`${name}_count${formatLabels(labels)} ${values.length}`);
    lines.push(`${name}_sum${formatLabels(labels)} ${sum}`);
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return `${lines.join("\n")}\n`;
}

/** 渲染 Jaeger/OTel exporter 风格 payload。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function renderJaeger(serviceName, spans) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    data: [{
      serviceName,
      spans: spans.map((span) => ({
        traceID: span.traceId,
        spanID: span.spanId,
        operationName: span.name,
        startTime: span.startTime,
        duration: span.endTime ? 1 : 0,
        tags: Object.entries(span.attributes).map(([key, value]) => ({ key, value })),
        logs: span.events,
      })),
    }],
  };
}

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function formatLabels(labels) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const entries = Object.entries(labels);
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (entries.length === 0) return "";
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return `{${entries.map(([key, value]) => `${key}="${String(value)}"`).join(",")}}`;
}

/** 带可观测性的 Agent 运行示例。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function runObservedAgent(goal, observability = createObservability()) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const root = observability.startSpan("agent.run", { goal, runId: "run-otel-0001" });
  observability.log("info", "agent run started", { runId: "run-otel-0001", goal });
  observability.increment("agent_runs_total", { status: "started" });

  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const toolSpan = observability.startSpan("tool.call", { parentSpanId: root.span.spanId, toolName: "searchDocs", traceId: root.span.traceId });
  toolSpan.addEvent("tool.input", { query: goal });
  observability.observe("agent_tool_latency_ms", { tool: "searchDocs" }, 37);
  observability.increment("agent_tool_calls_total", { tool: "searchDocs", status: "ok" });
  toolSpan.end("ok");

  observability.log("info", "agent run completed", { runId: "run-otel-0001", evidenceCount: 1 });
  observability.increment("agent_runs_total", { status: "completed" });
  root.end("ok");

  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    runId: "run-otel-0001",
    traceId: root.span.traceId,
    status: "completed",
  };
}

/** CLI demo：输出 logs、Prometheus metrics 和 Jaeger payload。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function runDemo() {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const observability = createObservability();
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const run = runObservedAgent("诊断 agent 工具调用延迟", observability);
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 69,
    title: "observability-otel-runtime",
    localOnly: true,
    run,
    logs: observability.logs(),
    prometheus: observability.prometheus(),
    jaeger: observability.jaeger(),
  };
}
