/**
 * Day 46：自包含学习源码。
 *
 * 这个文件属于 day46-observability-diagnosis-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：把 Grafana/Prometheus/log/trace 观测信号整理成可行动诊断，而不是只输出一段总结。
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createMockObservabilitySnapshot(overrides = {}) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    service: overrides.service ?? "gpmm_backend",
    window: overrides.window ?? "30m",
    metrics: {
      prometheusFresh: overrides.metrics?.prometheusFresh ?? true,
      errorRate: overrides.metrics?.errorRate ?? 0.064,
      p95LatencyMs: overrides.metrics?.p95LatencyMs ?? 1680,
      trafficRps: overrides.metrics?.trafficRps ?? 320,
    },
    grafana: {
      status: overrides.grafana?.status ?? 200,
      dashboardsVisible: overrides.grafana?.dashboardsVisible ?? true,
      renderContentType: overrides.grafana?.renderContentType ?? "image/png",
    },
    logs: overrides.logs ?? [
      { level: "error", count: 21, message: "query timeout on /api/cli/charts/render" },
      { level: "warn", count: 8, message: "grafana render returned slow response" },
    ],
    traces: overrides.traces ?? [
      { span: "grafana.render", p95Ms: 1240 },
      { span: "mongo.find.dashboard_acl", p95Ms: 380 },
    ],
    deploys: overrides.deploys ?? [
      { version: "2026.05.25.2", minutesAgo: 18, status: "success" },
    ],
  };
}

// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function addHypothesis(items, id, confidence, summary) {
  items.push({ id, confidence, summary });
}

// 观测诊断要先判定“工具链本身是否可信”，再判断服务是否真的故障。
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function classifyObservabilitySignals(snapshot = createMockObservabilitySnapshot()) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const hypotheses = [];
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (snapshot.grafana.status === 401 || snapshot.grafana.status === 403 || !snapshot.grafana.dashboardsVisible) {
    // 调用函数：把当前数据交给已有逻辑处理。
    addHypothesis(hypotheses, "observability-access", "high", "Grafana 权限或目录可见性异常，不能直接判定业务服务故障。");
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!snapshot.metrics.prometheusFresh) {
    // 调用函数：把当前数据交给已有逻辑处理。
    addHypothesis(hypotheses, "datasource-stale", "high", "Prometheus 数据不新鲜，先修数据源或采集链路。");
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (snapshot.grafana.renderContentType !== "image/png") {
    // 调用函数：把当前数据交给已有逻辑处理。
    addHypothesis(hypotheses, "render-contract-broken", "medium", "Grafana render 返回的不是 PNG，可能是鉴权页或错误页。");
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (snapshot.metrics.errorRate >= 0.05 || snapshot.metrics.p95LatencyMs >= 1500) {
    // 调用函数：把当前数据交给已有逻辑处理。
    addHypothesis(hypotheses, "service-regression", "medium", "错误率或延迟超过阈值，需要继续沿日志和 trace 定位业务链路。");
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (snapshot.traces.some((trace) => trace.p95Ms >= 1000)) {
    // 调用函数：把当前数据交给已有逻辑处理。
    addHypothesis(hypotheses, "trace-bottleneck", "medium", "trace 中存在慢 span，应优先查看该依赖或函数。");
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (snapshot.deploys.some((deploy) => deploy.minutesAgo <= 30)) {
    // 调用函数：把当前数据交给已有逻辑处理。
    addHypothesis(hypotheses, "recent-deploy", "medium", "最近 30 分钟有发布，需要对比发布前后指标。");
  }
  // 返回结果：调用方会拿到这个值继续后续流程。
  return hypotheses.length ? hypotheses : [{ id: "no-strong-signal", confidence: "low", summary: "当前观测信号不足，先扩大时间窗。" }];
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function buildObservabilityEvidence(snapshot = createMockObservabilitySnapshot()) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return [
    `service=${snapshot.service}`,
    `window=${snapshot.window}`,
    `grafana_status=${snapshot.grafana.status}`,
    `dashboards_visible=${snapshot.grafana.dashboardsVisible}`,
    `render_content_type=${snapshot.grafana.renderContentType}`,
    `prometheus_fresh=${snapshot.metrics.prometheusFresh}`,
    `error_rate=${snapshot.metrics.errorRate}`,
    `p95_latency_ms=${snapshot.metrics.p95LatencyMs}`,
    ...snapshot.logs.map((log) => `${log.level}:${log.count}:${log.message}`),
    ...snapshot.traces.map((trace) => `trace:${trace.span}:p95=${trace.p95Ms}`),
    ...snapshot.deploys.map((deploy) => `deploy:${deploy.version}:${deploy.minutesAgo}m:${deploy.status}`),
  ];
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function diagnoseObservability(snapshot = createMockObservabilitySnapshot()) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const hypotheses = classifyObservabilitySignals(snapshot);
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const hasToolingBlocker = hypotheses.some((item) => ["observability-access", "datasource-stale", "render-contract-broken"].includes(item.id));
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 46,
    title: "Grafana/Prometheus 观测诊断 Agent",
    localOnly: true,
    service: snapshot.service,
    status: hasToolingBlocker ? "verify-observability-first" : "investigate-service",
    evidence: buildObservabilityEvidence(snapshot),
    hypotheses,
    nextQueries: hasToolingBlocker
      ? ["确认 Grafana 当前用户权限", "检查 Prometheus scrape freshness", "验证 render content-type 和状态码"]
      : ["查询错误日志 TopN", "对比发布前后指标", "打开最慢 trace span"],
  };
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo() {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return diagnoseObservability(createMockObservabilitySnapshot());
}
