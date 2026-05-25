// 学习目标：把发布后验证拆成版本、健康检查、日志、前端资源和 smoke 结果。
export function createMockReleaseSnapshot(overrides = {}) {
  return {
    service: overrides.service ?? "gpmm_backend",
    environment: overrides.environment ?? "sit",
    expectedVersion: overrides.expectedVersion ?? "2026.05.25.3",
    deployedVersion: overrides.deployedVersion ?? "2026.05.25.3",
    health: {
      ready: overrides.health?.ready ?? true,
      statusCode: overrides.health?.statusCode ?? 200,
      latencyMs: overrides.health?.latencyMs ?? 86,
    },
    smoke: overrides.smoke ?? [
      { name: "healthz", ok: true },
      { name: "api/projects", ok: true },
      { name: "frontend-route", ok: true },
    ],
    logs: {
      errorCount: overrides.logs?.errorCount ?? 0,
      warningCount: overrides.logs?.warningCount ?? 2,
      keywords: overrides.logs?.keywords ?? ["release loaded", "permission cache warm"],
    },
    frontend: {
      expectedHash: overrides.frontend?.expectedHash ?? "app.20260525.js",
      loadedHash: overrides.frontend?.loadedHash ?? "app.20260525.js",
    },
    rollback: overrides.rollback ?? "deploy previous version 2026.05.25.2",
  };
}

export function collectReleaseChecks(snapshot = createMockReleaseSnapshot()) {
  return [
    { id: "version", ok: snapshot.deployedVersion === snapshot.expectedVersion, detail: `${snapshot.deployedVersion} vs ${snapshot.expectedVersion}` },
    { id: "health", ok: snapshot.health.ready && snapshot.health.statusCode === 200, detail: `status=${snapshot.health.statusCode} latency=${snapshot.health.latencyMs}` },
    { id: "smoke", ok: snapshot.smoke.every((item) => item.ok), detail: snapshot.smoke.map((item) => `${item.name}:${item.ok}`).join(",") },
    { id: "logs", ok: snapshot.logs.errorCount === 0, detail: `errors=${snapshot.logs.errorCount} warnings=${snapshot.logs.warningCount}` },
    { id: "frontend-hash", ok: snapshot.frontend.expectedHash === snapshot.frontend.loadedHash, detail: `${snapshot.frontend.loadedHash}` },
  ];
}

export function decideRelease(snapshot = createMockReleaseSnapshot()) {
  const checks = collectReleaseChecks(snapshot);
  const failed = checks.filter((item) => !item.ok);
  const hardFailure = failed.some((item) => ["version", "health", "smoke", "logs"].includes(item.id));
  const decision = hardFailure ? "rollback" : failed.length ? "watch" : "pass";
  return {
    day: 49,
    title: "测试环境发布验证 Agent",
    localOnly: true,
    service: snapshot.service,
    environment: snapshot.environment,
    decision,
    checks,
    evidence: [
      `expected_version=${snapshot.expectedVersion}`,
      `deployed_version=${snapshot.deployedVersion}`,
      `health=${snapshot.health.statusCode}`,
      `log_errors=${snapshot.logs.errorCount}`,
      `frontend_hash=${snapshot.frontend.loadedHash}`,
    ],
    nextActions: decision === "rollback"
      ? ["停止继续观察", "执行人工确认后的回滚流程", "保留失败日志和 smoke 输出"]
      : decision === "watch"
        ? ["继续观察前端资源或非关键告警", "不要立即扩大发布范围"]
        : ["记录验证结果", "继续短窗口观察错误率和日志"],
    rollbackPlan: decision === "rollback" ? snapshot.rollback : null,
  };
}

export function runDemo() {
  return decideRelease(createMockReleaseSnapshot());
}
