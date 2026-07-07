/**
 * Day 55：自包含学习源码。
 *
 * 这个文件属于 day55-incident-retro-quality-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：用结构化规则评估事故复盘质量，而不是只看文字是否像报告。
const REQUIRED_SECTIONS = ["timeline", "impact", "rootCause", "evidence", "fix", "prevention"];

export function createMockRetroReport(overrides = {}) {
  return {
    incidentId: overrides.incidentId ?? "INC-2026-0525-002",
    timeline: overrides.timeline ?? [
      { time: "10:00", event: "告警触发" },
      { time: "10:04", event: "确认 Mongo 慢查询" },
    ],
    impact: overrides.impact ?? { users: "SIT users", durationMin: 18, scope: "配置中心查询变慢" },
    rootCause: overrides.rootCause ?? "缺少复合索引导致查询退化。",
    evidence: overrides.evidence ?? ["p95_latency_ms=1840", "mongo slow query on cc_CfgFileDeployRecord"],
    fix: overrides.fix ?? ["临时限流", "补充索引并验证查询计划"],
    prevention: overrides.prevention ?? ["为关键查询增加 explain 回归", "把慢查询阈值接入告警"],
    rawText: overrides.rawText ?? "token=<redacted> password=<redacted>",
  };
}

function hasSensitiveLeak(text) {
  return /(token|password|client_secret|api_key)=((?!<redacted>)[^\s]+)/i.test(String(text || ""));
}

export function evaluateRetroQuality(report = createMockRetroReport()) {
  const missing = [];
  for (const section of REQUIRED_SECTIONS) {
    const value = report[section];
    if (Array.isArray(value) ? value.length === 0 : !value) {
      missing.push(section);
    }
  }

  const checks = [
    { id: "timeline", ok: Array.isArray(report.timeline) && report.timeline.length >= 2 },
    { id: "impact", ok: Boolean(report.impact?.durationMin && report.impact?.scope) },
    { id: "root-cause", ok: Boolean(report.rootCause && !/unknown|待补/i.test(report.rootCause)) },
    { id: "evidence", ok: Array.isArray(report.evidence) && report.evidence.length >= 2 },
    { id: "fix", ok: Array.isArray(report.fix) && report.fix.length > 0 },
    { id: "prevention", ok: Array.isArray(report.prevention) && report.prevention.length > 0 },
    { id: "redaction", ok: !hasSensitiveLeak(report.rawText) },
  ];
  const score = checks.filter((item) => item.ok).length;
  const status = score === checks.length ? "ready" : score >= 5 ? "needs-polish" : "incomplete";
  return {
    day: 55,
    title: "事故复盘质量评估 Agent",
    localOnly: true,
    incidentId: report.incidentId,
    status,
    score,
    maxScore: checks.length,
    missing,
    checks,
    nextActions: checks
      .filter((item) => !item.ok)
      .map((item) => `补齐 ${item.id}，否则复盘不可作为长期 runbook。`),
  };
}

export function runDemo() {
  return evaluateRetroQuality(createMockRetroReport());
}
