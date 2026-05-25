# Day 62 - Multi Agent Orchestration Runtime

## 概念

这一日实现多 Agent 编排 Runtime：DAG/graph、fan-out/fan-in、并发 worker、共享状态冲突检测、partial failure、预算、超时和取消。

## 代码结构

- `src/index.js`：图校验、调度器、冲突检测、失败恢复。
- `src/cli.js`：输出 coordinator 与各 agent handoff。
- `test/run.test.js`：覆盖编排边界。

## 运行

```bash
# 用途：运行 day62 多 Agent 编排 demo
# 执行目录：项目根目录
# 结果判断：result.status=completed，handoffs 包含 observe/permission/sql/review
# 风险：只做本地内存调度，不启动 worker 进程
npm run day62:start
```

## 实验

1. 让两个 agent 同时写 `final.report`，观察冲突阻断。
2. 把 `budgetLimit` 调低，观察预算触发降级。
3. 给某个 node 加 `failure: true`，区分可继续和不可继续失败。

## 复盘

- 多 Agent 编排的核心不是“多叫几个模型”，而是依赖、状态、预算、失败和审计。
- 共享状态写入要有 owner 和冲突策略，否则复盘时无法证明谁覆盖了谁。
