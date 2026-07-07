/**
 * Day 69：完整可观测性堆栈教学版。
 *
 * 学习目标：把结构化日志、Prometheus 指标和 OpenTelemetry/Jaeger trace 统一接入 Agent
 * runtime。默认使用内存 exporter，不启动 Jaeger 或 Prometheus。
 */

const DEFAULT_NOW = "2026-05-25T10:00:00.000Z";

function createTraceId(seed) {
  return `trace-${Buffer.from(seed).toString("hex").slice(0, 16)}`;
}

/** 创建内存可观测性 SDK，模拟 OTel tracer、logger 和 meter。 */
export function createObservability({ serviceName = "agent-runtime", now = () => DEFAULT_NOW } = {}) {
  const logs = [];
  const spans = [];
  const counters = new Map();
  const histograms = new Map();

  function log(level, message, fields = {}) {
    logs.push({ ts: now(), level, serviceName, message, ...fields });
  }

  function increment(name, labels = {}, value = 1) {
    const key = JSON.stringify({ name, labels });
    counters.set(key, (counters.get(key) || 0) + value);
  }

  function observe(name, labels = {}, value) {
    const key = JSON.stringify({ name, labels });
    histograms.set(key, [...(histograms.get(key) || []), value]);
  }

  function startSpan(name, attributes = {}) {
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
export function renderPrometheus(counters, histograms) {
  const lines = [];
  for (const [key, value] of counters.entries()) {
    const { name, labels } = JSON.parse(key);
    lines.push(`${name}${formatLabels(labels)} ${value}`);
  }
  for (const [key, values] of histograms.entries()) {
    const { name, labels } = JSON.parse(key);
    const sum = values.reduce((total, value) => total + value, 0);
    lines.push(`${name}_count${formatLabels(labels)} ${values.length}`);
    lines.push(`${name}_sum${formatLabels(labels)} ${sum}`);
  }
  return `${lines.join("\n")}\n`;
}

/** 渲染 Jaeger/OTel exporter 风格 payload。 */
export function renderJaeger(serviceName, spans) {
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

function formatLabels(labels) {
  const entries = Object.entries(labels);
  if (entries.length === 0) return "";
  return `{${entries.map(([key, value]) => `${key}="${String(value)}"`).join(",")}}`;
}

/** 带可观测性的 Agent 运行示例。 */
export function runObservedAgent(goal, observability = createObservability()) {
  const root = observability.startSpan("agent.run", { goal, runId: "run-otel-0001" });
  observability.log("info", "agent run started", { runId: "run-otel-0001", goal });
  observability.increment("agent_runs_total", { status: "started" });

  const toolSpan = observability.startSpan("tool.call", { parentSpanId: root.span.spanId, toolName: "searchDocs", traceId: root.span.traceId });
  toolSpan.addEvent("tool.input", { query: goal });
  observability.observe("agent_tool_latency_ms", { tool: "searchDocs" }, 37);
  observability.increment("agent_tool_calls_total", { tool: "searchDocs", status: "ok" });
  toolSpan.end("ok");

  observability.log("info", "agent run completed", { runId: "run-otel-0001", evidenceCount: 1 });
  observability.increment("agent_runs_total", { status: "completed" });
  root.end("ok");

  return {
    runId: "run-otel-0001",
    traceId: root.span.traceId,
    status: "completed",
  };
}

/** CLI demo：输出 logs、Prometheus metrics 和 Jaeger payload。 */
export function runDemo() {
  const observability = createObservability();
  const run = runObservedAgent("诊断 agent 工具调用延迟", observability);
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
