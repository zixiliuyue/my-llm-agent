/**
 * Day 58：自包含学习源码。
 *
 * 这个文件属于 day58-agent-harness-eval-replay，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：用确定性快照实现 Agent Harness 的回放、比较、评测和 CI 门禁。

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

function includesAll(actual = [], expected = []) {
  return expected.every((item) => actual.includes(item));
}

export function replayRun(snapshot) {
  const events = [
    { type: "input", value: snapshot.input },
    ...snapshot.modelResponses.map((content, index) => ({ type: "model_response", index, content })),
    ...snapshot.toolCalls.map((tool) => ({ type: "tool_call", name: tool.name, status: tool.status })),
    { type: "final", answer: snapshot.finalAnswer },
  ];
  return {
    runId: snapshot.runId,
    promptVersion: snapshot.promptVersion,
    model: snapshot.model,
    events,
    deterministic: true,
  };
}

export function scoreRun(snapshot, goldenCase) {
  const tools = snapshot.toolCalls.map((tool) => tool.name);
  const citations = snapshot.citations ?? [];
  const checks = [
    { id: "tool-call-accuracy", ok: includesAll(tools, goldenCase.expectedTools) },
    { id: "groundedness", ok: includesAll(citations, goldenCase.requiredCitations) },
    { id: "latency", ok: snapshot.latencyMs <= goldenCase.maxLatencyMs },
    { id: "cost", ok: snapshot.costUsd <= 0.02 },
    { id: "recovery", ok: snapshot.recoveredFromError === true || !goldenCase.id.includes("recovery") },
  ];
  const passed = checks.filter((check) => check.ok).length;
  return {
    caseId: goldenCase.id,
    score: passed / checks.length,
    checks,
    ok: passed === checks.length,
  };
}

export function compareRuns(baseline, candidate) {
  const latencyDeltaMs = candidate.latencyMs - baseline.latencyMs;
  const costDeltaUsd = Number((candidate.costUsd - baseline.costUsd).toFixed(4));
  const changedTools = candidate.toolCalls.map((tool) => tool.name).join(",") !== baseline.toolCalls.map((tool) => tool.name).join(",");
  return {
    baseline: baseline.runId,
    candidate: candidate.runId,
    latencyDeltaMs,
    costDeltaUsd,
    changedTools,
    regression: latencyDeltaMs > 500 || costDeltaUsd > 0.01 || changedTools,
  };
}

export function createMockSnapshots() {
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

export function evaluateSuite({ snapshots = createMockSnapshots(), dataset = GOLDEN_DATASET } = {}) {
  const results = dataset.map((goldenCase) => {
    const snapshot = snapshots.find((item) => item.caseId === goldenCase.id);
    if (!snapshot) return { caseId: goldenCase.id, ok: false, score: 0, checks: [{ id: "snapshot-present", ok: false }] };
    return scoreRun(snapshot, goldenCase);
  });
  const passRate = results.filter((item) => item.ok).length / results.length;
  return {
    results,
    passRate,
    ok: passRate === 1,
  };
}

export function runGate({ threshold = 1 } = {}) {
  const suite = evaluateSuite();
  return {
    day: 58,
    title: "Agent Harness Eval Replay Gate",
    ok: suite.passRate >= threshold,
    threshold,
    ...suite,
  };
}

export function runDemo() {
  const snapshots = createMockSnapshots();
  return {
    day: 58,
    title: "Agent Harness Eval Replay",
    localOnly: true,
    replay: replayRun(snapshots[0]),
    compare: compareRuns(snapshots[0], { ...snapshots[0], runId: "run-candidate", latencyMs: 920, costUsd: 0.0045 }),
    gate: runGate(),
  };
}
