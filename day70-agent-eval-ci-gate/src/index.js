/**
 * Day 70：Agent 评估与 CI 深度结合。
 *
 * 学习目标：把 day58 的 Harness 思路放进 PR 检查，输出可读 Markdown 报告，
 * 比较 baseline/current 指标，并给出 pass/fail gate。
 */

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
export const DEFAULT_BASELINE = {
  version: "main",
  metrics: {
    passRate: 0.95,
    toolCallAccuracy: 0.92,
    groundedness: 0.9,
    avgLatencyMs: 1200,
    costUsd: 0.018,
  },
};

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
export const DEFAULT_CURRENT = {
  version: "pr",
  metrics: {
    passRate: 0.97,
    toolCallAccuracy: 0.94,
    groundedness: 0.93,
    avgLatencyMs: 1260,
    costUsd: 0.019,
  },
};

/** 比较新旧评估指标，生成 gate 判断。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function compareEvalReports(baseline, current, thresholds = defaultThresholds()) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const rows = [
    compareHigherBetter("passRate", baseline, current, thresholds.minPassRate),
    compareHigherBetter("toolCallAccuracy", baseline, current, thresholds.minToolCallAccuracy),
    compareHigherBetter("groundedness", baseline, current, thresholds.minGroundedness),
    compareLowerBetter("avgLatencyMs", baseline, current, thresholds.maxLatencyRegressionRatio),
    compareLowerBetter("costUsd", baseline, current, thresholds.maxCostRegressionRatio),
  ];
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    ok: rows.every((row) => row.ok),
    rows,
    baselineVersion: baseline.version,
    currentVersion: current.version,
  };
}

// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function compareHigherBetter(name, baseline, current, minimum) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const base = baseline.metrics[name];
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const now = current.metrics[name];
  // 返回结果：调用方会拿到这个值继续后续流程。
  return { metric: name, baseline: base, current: now, delta: Number((now - base).toFixed(4)), ok: now >= minimum };
}

// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function compareLowerBetter(name, baseline, current, maxRatio) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const base = baseline.metrics[name];
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const now = current.metrics[name];
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const ratio = base === 0 ? 1 : now / base;
  // 返回结果：调用方会拿到这个值继续后续流程。
  return { metric: name, baseline: base, current: now, delta: Number((now - base).toFixed(4)), ratio: Number(ratio.toFixed(3)), ok: ratio <= maxRatio };
}

/** CI gate 默认阈值。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function defaultThresholds() {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    minPassRate: 0.9,
    minToolCallAccuracy: 0.9,
    minGroundedness: 0.88,
    maxLatencyRegressionRatio: 1.25,
    maxCostRegressionRatio: 1.3,
  };
}

/** 生成 PR 可读 Markdown 报告。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function renderMarkdownReport(comparison) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const lines = [
    "# Agent Eval CI Report",
    "",
    `Gate: ${comparison.ok ? "PASS" : "FAIL"}`,
    "",
    "| Metric | Baseline | Current | Delta | Status |",
    "|---|---:|---:|---:|---|",
  ];
  // 循环：按顺序处理多条数据或多个步骤。
  for (const row of comparison.rows) {
    lines.push(`| ${row.metric} | ${row.baseline} | ${row.current} | ${row.delta} | ${row.ok ? "PASS" : "FAIL"} |`);
  }
  // 返回结果：调用方会拿到这个值继续后续流程。
  return `${lines.join("\n")}\n`;
}

/** GitHub Actions workflow 内容；仓库根目录也会放真实 workflow 文件。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function createGithubActionsWorkflow() {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return `name: Agent Eval Gate
on:
  pull_request:
  push:
    branches: [main]
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm test
      - run: npm run day58:gate
      - run: npm run day70:ci
`;
}

/** CI 执行入口。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function runCiGate({ baseline = DEFAULT_BASELINE, current = DEFAULT_CURRENT } = {}) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const comparison = compareEvalReports(baseline, current);
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 70,
    title: "agent-eval-ci-gate",
    ok: comparison.ok,
    comparison,
    markdown: renderMarkdownReport(comparison),
  };
}

/** CLI demo：输出 gate 结果和 workflow 草案。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function runDemo() {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const gate = runCiGate();
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    ...gate,
    localOnly: true,
    workflow: createGithubActionsWorkflow(),
  };
}
