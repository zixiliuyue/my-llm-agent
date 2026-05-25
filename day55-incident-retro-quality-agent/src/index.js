/**
 * Day 55：自包含学习源码。
 *
 * 这个文件属于 day55-incident-retro-quality-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：用结构化规则评估事故复盘质量，而不是只看文字是否像报告。
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const REQUIRED_SECTIONS = ["timeline", "impact", "rootCause", "evidence", "fix", "prevention"];

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createMockRetroReport(overrides = {}) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
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

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function hasSensitiveLeak(text) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return /(token|password|client_secret|api_key)=((?!<redacted>)[^\s]+)/i.test(String(text || ""));
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function evaluateRetroQuality(report = createMockRetroReport()) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const missing = [];
  // 教学：循环：按顺序处理多条数据或多个步骤。
  for (const section of REQUIRED_SECTIONS) {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const value = report[section];
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (Array.isArray(value) ? value.length === 0 : !value) {
      missing.push(section);
    }
  }

  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const checks = [
    { id: "timeline", ok: Array.isArray(report.timeline) && report.timeline.length >= 2 },
    { id: "impact", ok: Boolean(report.impact?.durationMin && report.impact?.scope) },
    { id: "root-cause", ok: Boolean(report.rootCause && !/unknown|待补/i.test(report.rootCause)) },
    { id: "evidence", ok: Array.isArray(report.evidence) && report.evidence.length >= 2 },
    { id: "fix", ok: Array.isArray(report.fix) && report.fix.length > 0 },
    { id: "prevention", ok: Array.isArray(report.prevention) && report.prevention.length > 0 },
    { id: "redaction", ok: !hasSensitiveLeak(report.rawText) },
  ];
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const score = checks.filter((item) => item.ok).length;
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const status = score === checks.length ? "ready" : score >= 5 ? "needs-polish" : "incomplete";
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
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

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo() {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return evaluateRetroQuality(createMockRetroReport());
}
