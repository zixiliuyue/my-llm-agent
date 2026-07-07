/**
 * Day 62：多 Agent 编排 Runtime。
 *
 * 学习目标：实现 DAG/graph 编排、fan-out/fan-in、并发 worker、共享状态冲突检测、
 * partial failure、预算/超时/取消控制。实现保持同步和确定性，便于教学和单测。
 */

function readyNodes(nodes, completed, running, failed) {
  return nodes.filter((node) => (
    !completed.has(node.id)
    && !running.has(node.id)
    && !failed.has(node.id)
    && node.dependsOn.every((dep) => completed.has(dep))
  ));
}

function detectWriteConflicts(batch) {
  const seen = new Map();
  const conflicts = [];
  for (const node of batch) {
    for (const key of node.writes || []) {
      if (seen.has(key)) conflicts.push({ key, nodes: [seen.get(key), node.id] });
      seen.set(key, node.id);
    }
  }
  return conflicts;
}

/** 校验图结构，避免循环依赖导致 worker 永远无法推进。 */
export function validateGraph(graph) {
  const ids = new Set(graph.nodes.map((node) => node.id));
  for (const node of graph.nodes) {
    for (const dep of node.dependsOn || []) {
      if (!ids.has(dep)) throw new Error(`node ${node.id} 依赖不存在的 ${dep}`);
    }
  }
  return true;
}

/** 执行编排图；node.failure=true 用来模拟某个 agent 失败。 */
export function runGraph(graph, options = {}) {
  validateGraph(graph);
  const maxConcurrency = options.maxConcurrency || 2;
  const budgetLimit = options.budgetLimit ?? 10;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const cancelAfterStep = options.cancelAfterStep ?? Infinity;
  const completed = new Set();
  const failed = new Set();
  const running = new Set();
  const handoffs = [];
  const sharedState = {};
  const conflicts = [];
  const recovery = [];
  let spent = 0;
  let elapsed = 0;
  let step = 0;
  let status = "completed";

  const nodes = graph.nodes.map((node) => ({
    dependsOn: [],
    cost: 1,
    durationMs: 100,
    writes: [],
    canContinueOnFailure: false,
    ...node,
  }));

  // while 循环：只要条件成立就继续处理，适合解析或轮询。
  while (completed.size + failed.size < nodes.length) {
    step += 1;
    if (step > cancelAfterStep) {
      status = "cancelled";
      recovery.push("取消后停止调度新 agent，保留已完成 handoff");
      break;
    }
    const batch = readyNodes(nodes, completed, running, failed).slice(0, maxConcurrency);
    if (batch.length === 0) {
      status = "blocked";
      recovery.push("没有可运行节点，检查依赖、失败策略或冲突");
      break;
    }

    const batchConflicts = detectWriteConflicts(batch);
    if (batchConflicts.length > 0) {
      conflicts.push(...batchConflicts);
      status = "blocked";
      recovery.push("共享状态写冲突，需要 coordinator 拆分写入或加 merge agent");
      break;
    }

    for (const node of batch) running.add(node.id);
    for (const node of batch) {
      elapsed += node.durationMs;
      spent += node.cost;
      handoffs.push({
        from: node.dependsOn.length > 0 ? node.dependsOn : ["coordinator"],
        to: node.id,
        agent: node.agent,
        input: node.input || graph.goal,
      });

      if (elapsed > timeoutMs) {
        status = "timeout";
        recovery.push(`node ${node.id} 超时后停止调度`);
        running.delete(node.id);
        failed.add(node.id);
        break;
      }
      if (spent > budgetLimit) {
        status = "budget-exceeded";
        recovery.push(`预算 ${budgetLimit} 已耗尽，停止调度`);
        running.delete(node.id);
        failed.add(node.id);
        break;
      }
      if (node.failure) {
        failed.add(node.id);
        recovery.push(`node ${node.id} 失败，${node.canContinueOnFailure ? "继续 partial result" : "阻断下游"}`);
      } else {
        for (const key of node.writes) sharedState[key] = { owner: node.id, value: node.output || `${node.id}-output` };
        completed.add(node.id);
      }
      running.delete(node.id);
    }

    if (status !== "completed") break;
    const hardFailure = batch.some((node) => node.failure && !node.canContinueOnFailure);
    if (hardFailure) {
      status = "partial-failure";
      break;
    }
  }

  if (status === "completed" && completed.size < nodes.length) {
    status = failed.size > 0 ? "partial-failure" : "blocked";
  }

  return {
    graphId: graph.id,
    goal: graph.goal,
    status,
    completed: Array.from(completed),
    failed: Array.from(failed),
    handoffs,
    sharedState,
    conflicts,
    spent,
    elapsed,
    recovery,
  };
}

/** CLI demo：观测、权限、SQL 并发 fan-out 后由 reviewer 汇总。 */
export function runDemo() {
  const graph = {
    id: "ops-capstone-graph",
    goal: "诊断一次 agent run 失败并给出可审计结论",
    nodes: [
      { id: "observe", agent: "observability-agent", writes: ["evidence.observability"], output: "trace-ok" },
      { id: "permission", agent: "permission-agent", writes: ["evidence.permission"], output: "acl-ok" },
      { id: "sql-draft", agent: "sql-agent", writes: ["draft.sql"], output: "select-for-update", cost: 2 },
      { id: "review", agent: "coordinator", dependsOn: ["observe", "permission", "sql-draft"], writes: ["final.report"], output: "ready-for-human-review" },
    ],
  };

  return {
    day: 62,
    title: "multi-agent-orchestration-runtime",
    localOnly: true,
    result: runGraph(graph, { maxConcurrency: 3, budgetLimit: 8 }),
  };
}
