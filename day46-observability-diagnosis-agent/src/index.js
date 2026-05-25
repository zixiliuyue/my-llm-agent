// 学习目标：把 Grafana/Prometheus/log/trace 观测信号整理成可行动诊断，而不是只输出一段总结。
export function createMockObservabilitySnapshot(overrides = {}) {
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

function addHypothesis(items, id, confidence, summary) {
  items.push({ id, confidence, summary });
}

// 观测诊断要先判定“工具链本身是否可信”，再判断服务是否真的故障。
export function classifyObservabilitySignals(snapshot = createMockObservabilitySnapshot()) {
  const hypotheses = [];
  if (snapshot.grafana.status === 401 || snapshot.grafana.status === 403 || !snapshot.grafana.dashboardsVisible) {
    addHypothesis(hypotheses, "observability-access", "high", "Grafana 权限或目录可见性异常，不能直接判定业务服务故障。");
  }
  if (!snapshot.metrics.prometheusFresh) {
    addHypothesis(hypotheses, "datasource-stale", "high", "Prometheus 数据不新鲜，先修数据源或采集链路。");
  }
  if (snapshot.grafana.renderContentType !== "image/png") {
    addHypothesis(hypotheses, "render-contract-broken", "medium", "Grafana render 返回的不是 PNG，可能是鉴权页或错误页。");
  }
  if (snapshot.metrics.errorRate >= 0.05 || snapshot.metrics.p95LatencyMs >= 1500) {
    addHypothesis(hypotheses, "service-regression", "medium", "错误率或延迟超过阈值，需要继续沿日志和 trace 定位业务链路。");
  }
  if (snapshot.traces.some((trace) => trace.p95Ms >= 1000)) {
    addHypothesis(hypotheses, "trace-bottleneck", "medium", "trace 中存在慢 span，应优先查看该依赖或函数。");
  }
  if (snapshot.deploys.some((deploy) => deploy.minutesAgo <= 30)) {
    addHypothesis(hypotheses, "recent-deploy", "medium", "最近 30 分钟有发布，需要对比发布前后指标。");
  }
  return hypotheses.length ? hypotheses : [{ id: "no-strong-signal", confidence: "low", summary: "当前观测信号不足，先扩大时间窗。" }];
}

export function buildObservabilityEvidence(snapshot = createMockObservabilitySnapshot()) {
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

export function diagnoseObservability(snapshot = createMockObservabilitySnapshot()) {
  const hypotheses = classifyObservabilitySignals(snapshot);
  const hasToolingBlocker = hypotheses.some((item) => ["observability-access", "datasource-stale", "render-contract-broken"].includes(item.id));
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

export function runDemo() {
  return diagnoseObservability(createMockObservabilitySnapshot());
}
