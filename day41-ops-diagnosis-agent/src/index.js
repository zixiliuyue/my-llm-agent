/**
 * Day 41：自包含学习源码。
 *
 * 这个文件属于 day41-ops-diagnosis-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：把 SRE 排障拆成证据收集、假设生成和下一步动作，而不是让模型直接猜原因。
export function createMockOpsSnapshot(overrides = {}) {
  return {
    service: overrides.service ?? "cmdb_coreservice",
    window: overrides.window ?? "15m",
    metrics: {
      errorRate: overrides.metrics?.errorRate ?? 0.082,
      p95LatencyMs: overrides.metrics?.p95LatencyMs ?? 1840,
      trafficRps: overrides.metrics?.trafficRps ?? 210,
      up: overrides.metrics?.up ?? 1,
    },
    logs: overrides.logs ?? [
      { level: "error", count: 34, message: "mongo query timeout on cc_CfgFileDeployRecord" },
      { level: "warn", count: 12, message: "grafana folder permission 403 skipped" },
    ],
    deploys: overrides.deploys ?? [
      { version: "2026.05.25.1", minutesAgo: 9, status: "success", author: "release-bot" },
    ],
    dependencies: overrides.dependencies ?? [
      { name: "mongodb01", status: "degraded", signal: "COLLSCAN latency high" },
      { name: "redis-sentinel", status: "ok", signal: "master reachable" },
    ],
  };
}

function metricStatus(snapshot) {
  const { errorRate, p95LatencyMs, up } = snapshot.metrics;
  if (up !== 1) return { severity: "critical", reason: "服务 up 指标异常" };
  if (errorRate >= 0.05 || p95LatencyMs >= 1500) return { severity: "high", reason: "错误率或延迟超过阈值" };
  if (errorRate >= 0.01 || p95LatencyMs >= 800) return { severity: "medium", reason: "指标有轻微退化" };
  return { severity: "low", reason: "核心指标未超过阈值" };
}

// 把原始快照整理成可引用证据，后续报告必须从证据出发。
export function collectOpsEvidence(snapshot = createMockOpsSnapshot()) {
  const status = metricStatus(snapshot);
  return {
    service: snapshot.service,
    window: snapshot.window,
    severity: status.severity,
    evidence: [
      `error_rate=${snapshot.metrics.errorRate}`,
      `p95_latency_ms=${snapshot.metrics.p95LatencyMs}`,
      `traffic_rps=${snapshot.metrics.trafficRps}`,
      `up=${snapshot.metrics.up}`,
      ...snapshot.logs.map((log) => `${log.level}:${log.count}:${log.message}`),
      ...snapshot.dependencies.map((dep) => `${dep.name}:${dep.status}:${dep.signal}`),
      ...snapshot.deploys.map((deploy) => `deploy:${deploy.version}:${deploy.minutesAgo}m:${deploy.status}`),
    ],
    reason: status.reason,
  };
}

// 假设生成是确定性规则，模型只能负责润色，不负责决定证据是否存在。
export function buildDiagnosisHypotheses(snapshot = createMockOpsSnapshot()) {
  const hypotheses = [];
  if (snapshot.deploys.some((deploy) => deploy.minutesAgo <= 30)) {
    hypotheses.push({
      id: "recent-deploy",
      confidence: "medium",
      summary: "最近 30 分钟有发布，需对比发布前后错误率和日志。",
    });
  }
  if (snapshot.dependencies.some((dep) => dep.status === "degraded")) {
    hypotheses.push({
      id: "dependency-degraded",
      confidence: "high",
      summary: "依赖服务有退化信号，应优先看慢查询、连接池或下游 5xx。",
    });
  }
  if (snapshot.logs.some((log) => /timeout|COLLSCAN|403/i.test(log.message))) {
    hypotheses.push({
      id: "log-pattern",
      confidence: "high",
      summary: "错误日志出现可操作模式，优先沿日志关键字追真实链路。",
    });
  }
  if (hypotheses.length === 0) {
    hypotheses.push({ id: "unknown", confidence: "low", summary: "证据不足，先扩大时间窗和指标维度。" });
  }
  return hypotheses;
}

export function diagnoseIncident(snapshot = createMockOpsSnapshot()) {
  const evidence = collectOpsEvidence(snapshot);
  const hypotheses = buildDiagnosisHypotheses(snapshot);
  return {
    day: 41,
    title: "SRE 排障 Agent",
    localOnly: true,
    service: snapshot.service,
    severity: evidence.severity,
    evidence: evidence.evidence,
    hypotheses,
    nextActions: [
      "先确认发布前后指标差异，不直接回滚。",
      "按 evidence 里的依赖和日志关键字查询真实日志。",
      "如果确认是单个依赖退化，先隔离下游或降级，再写事故报告。",
    ],
  };
}

export function runDemo() {
  return diagnoseIncident(createMockOpsSnapshot());
}
