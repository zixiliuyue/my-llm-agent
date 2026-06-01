/**
 * Day 41：自包含学习源码。
 *
 * 这个文件属于 day41-ops-diagnosis-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：把 SRE 排障拆成证据收集、假设生成和下一步动作，而不是让模型直接猜原因。
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createMockOpsSnapshot(overrides = {}) {
  // 返回结果：调用方会拿到这个值继续后续流程。
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

// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function metricStatus(snapshot) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const { errorRate, p95LatencyMs, up } = snapshot.metrics;
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (up !== 1) return { severity: "critical", reason: "服务 up 指标异常" };
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (errorRate >= 0.05 || p95LatencyMs >= 1500) return { severity: "high", reason: "错误率或延迟超过阈值" };
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (errorRate >= 0.01 || p95LatencyMs >= 800) return { severity: "medium", reason: "指标有轻微退化" };
  // 返回结果：调用方会拿到这个值继续后续流程。
  return { severity: "low", reason: "核心指标未超过阈值" };
}

// 把原始快照整理成可引用证据，后续报告必须从证据出发。
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function collectOpsEvidence(snapshot = createMockOpsSnapshot()) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const status = metricStatus(snapshot);
  // 返回结果：调用方会拿到这个值继续后续流程。
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
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function buildDiagnosisHypotheses(snapshot = createMockOpsSnapshot()) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const hypotheses = [];
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (snapshot.deploys.some((deploy) => deploy.minutesAgo <= 30)) {
    hypotheses.push({
      id: "recent-deploy",
      confidence: "medium",
      summary: "最近 30 分钟有发布，需对比发布前后错误率和日志。",
    });
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (snapshot.dependencies.some((dep) => dep.status === "degraded")) {
    hypotheses.push({
      id: "dependency-degraded",
      confidence: "high",
      summary: "依赖服务有退化信号，应优先看慢查询、连接池或下游 5xx。",
    });
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (snapshot.logs.some((log) => /timeout|COLLSCAN|403/i.test(log.message))) {
    hypotheses.push({
      id: "log-pattern",
      confidence: "high",
      summary: "错误日志出现可操作模式，优先沿日志关键字追真实链路。",
    });
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (hypotheses.length === 0) {
    hypotheses.push({ id: "unknown", confidence: "low", summary: "证据不足，先扩大时间窗和指标维度。" });
  }
  // 返回结果：调用方会拿到这个值继续后续流程。
  return hypotheses;
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function diagnoseIncident(snapshot = createMockOpsSnapshot()) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const evidence = collectOpsEvidence(snapshot);
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const hypotheses = buildDiagnosisHypotheses(snapshot);
  // 返回结果：调用方会拿到这个值继续后续流程。
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

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo() {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return diagnoseIncident(createMockOpsSnapshot());
}
