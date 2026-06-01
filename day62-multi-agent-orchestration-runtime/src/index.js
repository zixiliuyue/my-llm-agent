/**
 * Day 62：多 Agent 编排 Runtime。
 *
 * 学习目标：实现 DAG/graph 编排、fan-out/fan-in、并发 worker、共享状态冲突检测、
 * partial failure、预算/超时/取消控制。实现保持同步和确定性，便于教学和单测。
 */

// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function readyNodes(nodes, completed, running, failed) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return nodes.filter((node) => (
    !completed.has(node.id)
    && !running.has(node.id)
    && !failed.has(node.id)
    && node.dependsOn.every((dep) => completed.has(dep))
  ));
}

// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function detectWriteConflicts(batch) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const seen = new Map();
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const conflicts = [];
  // 循环：按顺序处理多条数据或多个步骤。
  for (const node of batch) {
    // 循环：按顺序处理多条数据或多个步骤。
    for (const key of node.writes || []) {
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (seen.has(key)) conflicts.push({ key, nodes: [seen.get(key), node.id] });
      seen.set(key, node.id);
    }
  }
  // 返回结果：调用方会拿到这个值继续后续流程。
  return conflicts;
}

/** 校验图结构，避免循环依赖导致 worker 永远无法推进。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function validateGraph(graph) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const ids = new Set(graph.nodes.map((node) => node.id));
  // 循环：按顺序处理多条数据或多个步骤。
  for (const node of graph.nodes) {
    // 循环：按顺序处理多条数据或多个步骤。
    for (const dep of node.dependsOn || []) {
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (!ids.has(dep)) throw new Error(`node ${node.id} 依赖不存在的 ${dep}`);
    }
  }
  // 返回结果：调用方会拿到这个值继续后续流程。
  return true;
}

/** 执行编排图；node.failure=true 用来模拟某个 agent 失败。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function runGraph(graph, options = {}) {
  validateGraph(graph);
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const maxConcurrency = options.maxConcurrency || 2;
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const budgetLimit = options.budgetLimit ?? 10;
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const timeoutMs = options.timeoutMs ?? 10_000;
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const cancelAfterStep = options.cancelAfterStep ?? Infinity;
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const completed = new Set();
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const failed = new Set();
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const running = new Set();
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const handoffs = [];
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const sharedState = {};
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const conflicts = [];
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const recovery = [];
  // 定义变量：这个值后面会被更新，所以使用 let。
  let spent = 0;
  // 定义变量：这个值后面会被更新，所以使用 let。
  let elapsed = 0;
  // 定义变量：这个值后面会被更新，所以使用 let。
  let step = 0;
  // 定义变量：这个值后面会被更新，所以使用 let。
  let status = "completed";

  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
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
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (step > cancelAfterStep) {
      status = "cancelled";
      recovery.push("取消后停止调度新 agent，保留已完成 handoff");
      break;
    }
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const batch = readyNodes(nodes, completed, running, failed).slice(0, maxConcurrency);
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (batch.length === 0) {
      status = "blocked";
      recovery.push("没有可运行节点，检查依赖、失败策略或冲突");
      break;
    }

    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const batchConflicts = detectWriteConflicts(batch);
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (batchConflicts.length > 0) {
      conflicts.push(...batchConflicts);
      status = "blocked";
      recovery.push("共享状态写冲突，需要 coordinator 拆分写入或加 merge agent");
      break;
    }

    // 循环：按顺序处理多条数据或多个步骤。
    for (const node of batch) running.add(node.id);
    // 循环：按顺序处理多条数据或多个步骤。
    for (const node of batch) {
      elapsed += node.durationMs;
      spent += node.cost;
      handoffs.push({
        from: node.dependsOn.length > 0 ? node.dependsOn : ["coordinator"],
        to: node.id,
        agent: node.agent,
        input: node.input || graph.goal,
      });

      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (elapsed > timeoutMs) {
        status = "timeout";
        recovery.push(`node ${node.id} 超时后停止调度`);
        running.delete(node.id);
        failed.add(node.id);
        break;
      }
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (spent > budgetLimit) {
        status = "budget-exceeded";
        recovery.push(`预算 ${budgetLimit} 已耗尽，停止调度`);
        running.delete(node.id);
        failed.add(node.id);
        break;
      }
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (node.failure) {
        failed.add(node.id);
        recovery.push(`node ${node.id} 失败，${node.canContinueOnFailure ? "继续 partial result" : "阻断下游"}`);
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      } else {
        // 循环：按顺序处理多条数据或多个步骤。
        for (const key of node.writes) sharedState[key] = { owner: node.id, value: node.output || `${node.id}-output` };
        completed.add(node.id);
      }
      running.delete(node.id);
    }

    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (status !== "completed") break;
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const hardFailure = batch.some((node) => node.failure && !node.canContinueOnFailure);
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (hardFailure) {
      status = "partial-failure";
      break;
    }
  }

  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (status === "completed" && completed.size < nodes.length) {
    status = failed.size > 0 ? "partial-failure" : "blocked";
  }

  // 返回结果：调用方会拿到这个值继续后续流程。
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
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function runDemo() {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
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

  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 62,
    title: "multi-agent-orchestration-runtime",
    localOnly: true,
    result: runGraph(graph, { maxConcurrency: 3, budgetLimit: 8 }),
  };
}
