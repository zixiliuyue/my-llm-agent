/**
 * Day 70：Agent 评估与 CI 深度结合。
 *
 * 学习目标：把 day58 的 Harness 思路放进 PR 检查，输出可读 Markdown 报告，
 * 比较 baseline/current 指标，并给出 pass/fail gate。
 */

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
export function compareEvalReports(baseline, current, thresholds = defaultThresholds()) {
  const rows = [
    compareHigherBetter("passRate", baseline, current, thresholds.minPassRate),
    compareHigherBetter("toolCallAccuracy", baseline, current, thresholds.minToolCallAccuracy),
    compareHigherBetter("groundedness", baseline, current, thresholds.minGroundedness),
    compareLowerBetter("avgLatencyMs", baseline, current, thresholds.maxLatencyRegressionRatio),
    compareLowerBetter("costUsd", baseline, current, thresholds.maxCostRegressionRatio),
  ];
  return {
    ok: rows.every((row) => row.ok),
    rows,
    baselineVersion: baseline.version,
    currentVersion: current.version,
  };
}

function compareHigherBetter(name, baseline, current, minimum) {
  const base = baseline.metrics[name];
  const now = current.metrics[name];
  return { metric: name, baseline: base, current: now, delta: Number((now - base).toFixed(4)), ok: now >= minimum };
}

function compareLowerBetter(name, baseline, current, maxRatio) {
  const base = baseline.metrics[name];
  const now = current.metrics[name];
  const ratio = base === 0 ? 1 : now / base;
  return { metric: name, baseline: base, current: now, delta: Number((now - base).toFixed(4)), ratio: Number(ratio.toFixed(3)), ok: ratio <= maxRatio };
}

/** CI gate 默认阈值。 */
export function defaultThresholds() {
  return {
    minPassRate: 0.9,
    minToolCallAccuracy: 0.9,
    minGroundedness: 0.88,
    maxLatencyRegressionRatio: 1.25,
    maxCostRegressionRatio: 1.3,
  };
}

/** 生成 PR 可读 Markdown 报告。 */
export function renderMarkdownReport(comparison) {
  const lines = [
    "# Agent Eval CI Report",
    "",
    `Gate: ${comparison.ok ? "PASS" : "FAIL"}`,
    "",
    "| Metric | Baseline | Current | Delta | Status |",
    "|---|---:|---:|---:|---|",
  ];
  for (const row of comparison.rows) {
    lines.push(`| ${row.metric} | ${row.baseline} | ${row.current} | ${row.delta} | ${row.ok ? "PASS" : "FAIL"} |`);
  }
  return `${lines.join("\n")}\n`;
}

/** GitHub Actions workflow 内容；仓库根目录也会放真实 workflow 文件。 */
export function createGithubActionsWorkflow() {
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
export function runCiGate({ baseline = DEFAULT_BASELINE, current = DEFAULT_CURRENT } = {}) {
  const comparison = compareEvalReports(baseline, current);
  return {
    day: 70,
    title: "agent-eval-ci-gate",
    ok: comparison.ok,
    comparison,
    markdown: renderMarkdownReport(comparison),
  };
}

/** CLI demo：输出 gate 结果和 workflow 草案。 */
export function runDemo() {
  const gate = runCiGate();
  return {
    ...gate,
    localOnly: true,
    workflow: createGithubActionsWorkflow(),
  };
}
