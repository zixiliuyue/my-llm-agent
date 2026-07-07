/**
 * Day 63：发布、灰度和版本管理。
 *
 * 学习目标：管理 prompt/model/tool/spec 版本，模拟 shadow run、canary eval、灰度比例、
 * 线上指标触发降级和回滚审计。模型不能自己决定上线比例，发布策略由确定性配置执行。
 */

function hashString(text) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
}

/** 创建版本仓库，保存 prompt/model/tool/spec 的不可变快照。 */
export function createVersionRegistry() {
  const versions = new Map();
  return {
    register(kind, payload, createdBy = "release-manager") {
      const list = versions.get(kind) || [];
      const id = `${kind}-v${list.length + 1}`;
      const record = {
        id,
        kind,
        payload: structuredClone(payload),
        createdBy,
        createdAt: "2026-05-25T10:00:00.000Z",
      };
      list.push(record);
      versions.set(kind, list);
      return record;
    },
    latest(kind) {
      const list = versions.get(kind) || [];
      return list.at(-1) || null;
    },
    get(id) {
      for (const list of versions.values()) {
        const record = list.find((item) => item.id === id);
        if (record) return record;
      }
      return null;
    },
    snapshot() {
      return Object.fromEntries(Array.from(versions.entries()).map(([kind, list]) => [kind, list.map((item) => item.id)]));
    },
  };
}

/** 根据 userId 稳定分流，避免同一用户在灰度期间反复跳版本。 */
export function routeByGrayPercent(userId, release) {
  const bucket = hashString(`${release.id}:${userId}`) % 100;
  return bucket < release.grayPercent ? release.candidateVersion : release.stableVersion;
}

/** 生成一次发布计划，包含 shadow、canary、灰度和回滚策略。 */
export function createReleasePlan({ id, stableVersion, candidateVersion, grayPercent = 5, evalThreshold = 0.9 }) {
  return {
    id,
    stableVersion,
    candidateVersion,
    grayPercent,
    evalThreshold,
    stages: ["shadow", "canary-eval", "gray", "full-rollout"],
    rollback: { target: stableVersion, trigger: "eval_failed_or_metrics_degraded" },
  };
}

/** 对 shadow/canary 结果做 gate，输出发布或回滚审计记录。 */
export function evaluateRelease(plan, metrics) {
  const passEval = metrics.evalScore >= plan.evalThreshold;
  const passOnline = metrics.errorRate <= 0.02 && metrics.p95LatencyMs <= 2500 && metrics.toolFailureRate <= 0.03;
  const status = passEval && passOnline ? "canary-passed" : "rollback-required";
  const audit = {
    releaseId: plan.id,
    status,
    checkedAt: "2026-05-25T10:05:00.000Z",
    reasons: [
      ...(passEval ? [] : [`evalScore ${metrics.evalScore} < ${plan.evalThreshold}`]),
      ...(metrics.errorRate <= 0.02 ? [] : [`errorRate ${metrics.errorRate} > 0.02`]),
      ...(metrics.p95LatencyMs <= 2500 ? [] : [`p95LatencyMs ${metrics.p95LatencyMs} > 2500`]),
      ...(metrics.toolFailureRate <= 0.03 ? [] : [`toolFailureRate ${metrics.toolFailureRate} > 0.03`]),
    ],
    nextVersion: status === "canary-passed" ? plan.candidateVersion : plan.rollback.target,
  };
  return { status, audit };
}

/** 比较 stable 和 candidate 的 shadow run，用于 prompt/model/tool/spec 变更前置评估。 */
export function shadowCompare(stableRun, candidateRun) {
  return {
    sameToolPlan: JSON.stringify(stableRun.toolPlan) === JSON.stringify(candidateRun.toolPlan),
    groundednessDelta: Number((candidateRun.groundedness - stableRun.groundedness).toFixed(3)),
    latencyDeltaMs: candidateRun.latencyMs - stableRun.latencyMs,
    pass: candidateRun.groundedness >= stableRun.groundedness && candidateRun.latencyMs <= stableRun.latencyMs * 1.5,
  };
}

/** CLI demo：注册版本、创建灰度、评估 canary 并输出 release note。 */
export function runDemo() {
  const registry = createVersionRegistry();
  const stablePrompt = registry.register("prompt", { name: "ops-diagnosis", text: "diagnose with evidence" });
  const candidatePrompt = registry.register("prompt", { name: "ops-diagnosis", text: "diagnose with evidence and cite risks" });
  const model = registry.register("model", { provider: "ollama", model: "qwen2.5-coder:14b" });
  const tool = registry.register("tool", { name: "remote.shell.dryRun", version: "1.0.0" });
  const spec = registry.register("spec", { schema: "agent-run-v2" });
  const plan = createReleasePlan({
    id: "rel-20260525-agent-ops",
    stableVersion: stablePrompt.id,
    candidateVersion: candidatePrompt.id,
    grayPercent: 10,
  });
  const shadow = shadowCompare(
    { toolPlan: ["rag", "approval"], groundedness: 0.88, latencyMs: 900 },
    { toolPlan: ["rag", "approval"], groundedness: 0.93, latencyMs: 1100 },
  );
  const evaluation = evaluateRelease(plan, { evalScore: 0.94, errorRate: 0.01, p95LatencyMs: 1200, toolFailureRate: 0.01 });

  return {
    day: 63,
    title: "agent-release-and-gray-control",
    localOnly: true,
    registry: registry.snapshot(),
    relatedVersions: [model.id, tool.id, spec.id],
    plan,
    routedExample: routeByGrayPercent("tome", plan),
    shadow,
    evaluation,
    releaseNote: `${plan.id} ${evaluation.status}: ${candidatePrompt.id} gray=${plan.grayPercent}%`,
  };
}
