/**
 * Day 63：发布、灰度和版本管理。
 *
 * 学习目标：管理 prompt/model/tool/spec 版本，模拟 shadow run、canary eval、灰度比例、
 * 线上指标触发降级和回滚审计。模型不能自己决定上线比例，发布策略由确定性配置执行。
 */

// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function hashString(text) {
  // 定义变量：这个值后面会被更新，所以使用 let。
  let hash = 0;
  // 循环：按顺序处理多条数据或多个步骤。
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  // 返回结果：调用方会拿到这个值继续后续流程。
  return hash;
}

/** 创建版本仓库，保存 prompt/model/tool/spec 的不可变快照。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function createVersionRegistry() {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const versions = new Map();
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    register(kind, payload, createdBy = "release-manager") {
      // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const list = versions.get(kind) || [];
      // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const id = `${kind}-v${list.length + 1}`;
      // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const record = {
        id,
        kind,
        payload: structuredClone(payload),
        createdBy,
        createdAt: "2026-05-25T10:00:00.000Z",
      };
      list.push(record);
      versions.set(kind, list);
      // 返回结果：调用方会拿到这个值继续后续流程。
      return record;
    },
    latest(kind) {
      // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const list = versions.get(kind) || [];
      // 返回结果：调用方会拿到这个值继续后续流程。
      return list.at(-1) || null;
    },
    get(id) {
      // 循环：按顺序处理多条数据或多个步骤。
      for (const list of versions.values()) {
        // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
        const record = list.find((item) => item.id === id);
        // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
        if (record) return record;
      }
      // 返回结果：调用方会拿到这个值继续后续流程。
      return null;
    },
    snapshot() {
      // 返回结果：调用方会拿到这个值继续后续流程。
      return Object.fromEntries(Array.from(versions.entries()).map(([kind, list]) => [kind, list.map((item) => item.id)]));
    },
  };
}

/** 根据 userId 稳定分流，避免同一用户在灰度期间反复跳版本。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function routeByGrayPercent(userId, release) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const bucket = hashString(`${release.id}:${userId}`) % 100;
  // 返回结果：调用方会拿到这个值继续后续流程。
  return bucket < release.grayPercent ? release.candidateVersion : release.stableVersion;
}

/** 生成一次发布计划，包含 shadow、canary、灰度和回滚策略。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function createReleasePlan({ id, stableVersion, candidateVersion, grayPercent = 5, evalThreshold = 0.9 }) {
  // 返回结果：调用方会拿到这个值继续后续流程。
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
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function evaluateRelease(plan, metrics) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const passEval = metrics.evalScore >= plan.evalThreshold;
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const passOnline = metrics.errorRate <= 0.02 && metrics.p95LatencyMs <= 2500 && metrics.toolFailureRate <= 0.03;
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const status = passEval && passOnline ? "canary-passed" : "rollback-required";
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
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
  // 返回结果：调用方会拿到这个值继续后续流程。
  return { status, audit };
}

/** 比较 stable 和 candidate 的 shadow run，用于 prompt/model/tool/spec 变更前置评估。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function shadowCompare(stableRun, candidateRun) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    sameToolPlan: JSON.stringify(stableRun.toolPlan) === JSON.stringify(candidateRun.toolPlan),
    groundednessDelta: Number((candidateRun.groundedness - stableRun.groundedness).toFixed(3)),
    latencyDeltaMs: candidateRun.latencyMs - stableRun.latencyMs,
    pass: candidateRun.groundedness >= stableRun.groundedness && candidateRun.latencyMs <= stableRun.latencyMs * 1.5,
  };
}

/** CLI demo：注册版本、创建灰度、评估 canary 并输出 release note。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function runDemo() {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const registry = createVersionRegistry();
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const stablePrompt = registry.register("prompt", { name: "ops-diagnosis", text: "diagnose with evidence" });
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const candidatePrompt = registry.register("prompt", { name: "ops-diagnosis", text: "diagnose with evidence and cite risks" });
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const model = registry.register("model", { provider: "ollama", model: "qwen2.5-coder:14b" });
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const tool = registry.register("tool", { name: "remote.shell.dryRun", version: "1.0.0" });
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const spec = registry.register("spec", { schema: "agent-run-v2" });
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const plan = createReleasePlan({
    id: "rel-20260525-agent-ops",
    stableVersion: stablePrompt.id,
    candidateVersion: candidatePrompt.id,
    grayPercent: 10,
  });
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const shadow = shadowCompare(
    { toolPlan: ["rag", "approval"], groundedness: 0.88, latencyMs: 900 },
    { toolPlan: ["rag", "approval"], groundedness: 0.93, latencyMs: 1100 },
  );
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const evaluation = evaluateRelease(plan, { evalScore: 0.94, errorRate: 0.01, p95LatencyMs: 1200, toolFailureRate: 0.01 });

  // 返回结果：调用方会拿到这个值继续后续流程。
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
