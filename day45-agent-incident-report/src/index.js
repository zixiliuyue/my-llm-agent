// 学习目标：把排障证据、权限审计和命令 dry-run 记录整理成事故报告。
function redact(value) {
  return String(value)
    .replace(/token=[^\s]+/gi, "token=<redacted>")
    .replace(/password=[^\s]+/gi, "password=<redacted>");
}

export function createMockIncidentContext() {
  return {
    incidentId: "INC-2026-0525-001",
    service: "cmdb_coreservice",
    severity: "high",
    diagnosis: {
      evidence: [
        "error_rate=0.082",
        "p95_latency_ms=1840",
        "error:34:mongo query timeout on cc_CfgFileDeployRecord",
      ],
      hypotheses: [
        { id: "dependency-degraded", confidence: "high", summary: "Mongo 慢查询导致接口延迟和错误率升高。" },
      ],
    },
    audits: [
      { type: "permission", user: "alice", action: "query_dashboard", allowed: false },
      { type: "command", user: "hongsen.ren", command: "journalctl -u gpmm_backend", executed: false },
    ],
    timeline: [
      { time: "10:00", event: "告警触发" },
      { time: "10:04", event: "确认 Mongo 慢查询日志" },
      { time: "10:08", event: "准备降级和索引排查动作" },
    ],
  };
}

export function buildActionItems(context) {
  const items = [
    { owner: "sre", action: "确认慢查询是否需要临时限流或降级", due: "today" },
    { owner: "backend", action: "检查 cc_CfgFileDeployRecord 查询索引和分页条件", due: "this-week" },
    { owner: "platform", action: "把本次排障证据补进 runbook", due: "this-week" },
  ];
  if (context.audits.some((audit) => audit.allowed === false)) {
    items.push({ owner: "platform", action: "复核权限拒绝是否符合预期", due: "today" });
  }
  return items;
}

export function createIncidentReport(context = createMockIncidentContext()) {
  const actions = buildActionItems(context);
  const lines = [
    `# ${context.incidentId} 事故报告`,
    "",
    `服务：${context.service}`,
    `级别：${context.severity}`,
    "",
    "## 证据",
    ...context.diagnosis.evidence.map((item) => `- ${redact(item)}`),
    "",
    "## 判断",
    ...context.diagnosis.hypotheses.map((item) => `- [${item.confidence}] ${redact(item.summary)}`),
    "",
    "## 时间线",
    ...context.timeline.map((item) => `- ${item.time} ${redact(item.event)}`),
    "",
    "## 审计",
    ...context.audits.map((audit) => `- ${audit.type} user=${audit.user} allowed=${audit.allowed ?? "n/a"} executed=${audit.executed ?? "n/a"}`),
    "",
    "## 后续动作",
    ...actions.map((item) => `- ${item.owner}: ${item.action} (${item.due})`),
  ];
  return lines.join("\n");
}

export function runDemo() {
  const context = createMockIncidentContext();
  return {
    day: 45,
    title: "Agent 事故报告",
    incidentId: context.incidentId,
    actionItems: buildActionItems(context),
    markdown: createIncidentReport(context),
  };
}
