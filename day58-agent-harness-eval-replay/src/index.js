/**
 * Day 58：自包含学习源码。
 *
 * 这个文件属于 day58-agent-harness-eval-replay，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：用确定性快照实现 Agent Harness 的回放、比较、评测和 CI 门禁。

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
export const GOLDEN_DATASET = [
  {
    id: "case-tool-call",
    input: "查询 api p95 并给出结论",
    expectedTools: ["query_metrics"],
    requiredCitations: ["metrics:p95"],
    maxLatencyMs: 1200,
  },
  {
    id: "case-recovery",
    input: "模型第一次返回坏 JSON 后恢复",
    expectedTools: ["repair_protocol"],
    requiredCitations: ["trace:retry"],
    maxLatencyMs: 1500,
  },
];

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function includesAll(actual = [], expected = []) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return expected.every((item) => actual.includes(item));
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function replayRun(snapshot) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const events = [
    { type: "input", value: snapshot.input },
    ...snapshot.modelResponses.map((content, index) => ({ type: "model_response", index, content })),
    ...snapshot.toolCalls.map((tool) => ({ type: "tool_call", name: tool.name, status: tool.status })),
    { type: "final", answer: snapshot.finalAnswer },
  ];
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    runId: snapshot.runId,
    promptVersion: snapshot.promptVersion,
    model: snapshot.model,
    events,
    deterministic: true,
  };
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function scoreRun(snapshot, goldenCase) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const tools = snapshot.toolCalls.map((tool) => tool.name);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const citations = snapshot.citations ?? [];
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const checks = [
    { id: "tool-call-accuracy", ok: includesAll(tools, goldenCase.expectedTools) },
    { id: "groundedness", ok: includesAll(citations, goldenCase.requiredCitations) },
    { id: "latency", ok: snapshot.latencyMs <= goldenCase.maxLatencyMs },
    { id: "cost", ok: snapshot.costUsd <= 0.02 },
    { id: "recovery", ok: snapshot.recoveredFromError === true || !goldenCase.id.includes("recovery") },
  ];
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const passed = checks.filter((check) => check.ok).length;
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    caseId: goldenCase.id,
    score: passed / checks.length,
    checks,
    ok: passed === checks.length,
  };
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function compareRuns(baseline, candidate) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const latencyDeltaMs = candidate.latencyMs - baseline.latencyMs;
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const costDeltaUsd = Number((candidate.costUsd - baseline.costUsd).toFixed(4));
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const changedTools = candidate.toolCalls.map((tool) => tool.name).join(",") !== baseline.toolCalls.map((tool) => tool.name).join(",");
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    baseline: baseline.runId,
    candidate: candidate.runId,
    latencyDeltaMs,
    costDeltaUsd,
    changedTools,
    regression: latencyDeltaMs > 500 || costDeltaUsd > 0.01 || changedTools,
  };
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createMockSnapshots() {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return [
    {
      runId: "run-a",
      caseId: "case-tool-call",
      input: "查询 api p95 并给出结论",
      promptVersion: "prompt@1",
      model: "qwen2.5:7b",
      modelResponses: ["tool_call query_metrics", "final"],
      toolCalls: [{ name: "query_metrics", status: "succeeded" }],
      citations: ["metrics:p95"],
      finalAnswer: "p95 正常。",
      latencyMs: 880,
      costUsd: 0.004,
      recoveredFromError: false,
    },
    {
      runId: "run-b",
      caseId: "case-recovery",
      input: "模型第一次返回坏 JSON 后恢复",
      promptVersion: "prompt@1",
      model: "qwen2.5:7b",
      modelResponses: ["not-json", "tool_call repair_protocol", "final"],
      toolCalls: [{ name: "repair_protocol", status: "succeeded" }],
      citations: ["trace:retry"],
      finalAnswer: "协议已恢复。",
      latencyMs: 990,
      costUsd: 0.005,
      recoveredFromError: true,
    },
  ];
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function evaluateSuite({ snapshots = createMockSnapshots(), dataset = GOLDEN_DATASET } = {}) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const results = dataset.map((goldenCase) => {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const snapshot = snapshots.find((item) => item.caseId === goldenCase.id);
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!snapshot) return { caseId: goldenCase.id, ok: false, score: 0, checks: [{ id: "snapshot-present", ok: false }] };
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return scoreRun(snapshot, goldenCase);
  });
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const passRate = results.filter((item) => item.ok).length / results.length;
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    results,
    passRate,
    ok: passRate === 1,
  };
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runGate({ threshold = 1 } = {}) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const suite = evaluateSuite();
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 58,
    title: "Agent Harness Eval Replay Gate",
    ok: suite.passRate >= threshold,
    threshold,
    ...suite,
  };
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo() {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const snapshots = createMockSnapshots();
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 58,
    title: "Agent Harness Eval Replay",
    localOnly: true,
    replay: replayRun(snapshots[0]),
    compare: compareRuns(snapshots[0], { ...snapshots[0], runId: "run-candidate", latencyMs: 920, costUsd: 0.0045 }),
    gate: runGate(),
  };
}
