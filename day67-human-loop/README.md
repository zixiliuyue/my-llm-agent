# Day 67 - Human Loop

## 概念

这一日实现端到端 Human-in-the-Loop：Agent 在敏感操作前暂停，发送通知，等待 webhook 决策，批准后继续，拒绝后进入回滚路径。

## 代码结构

- `src/index.js`：HITL workflow、内存通知器、webhook payload、签名校验和状态机。
- `src/cli.js`：输出批准和拒绝两条完整链路。
- `test/run.test.js`：覆盖暂停、通知、决策、防重复和回滚。

## 运行

```bash
# 用途：运行 HITL 审批闭环 demo
# 执行目录：项目根目录
# 结果判断：approved.status=resumed，rejected.status=rollback-required
# 风险：只使用内存通知和 mock webhook，不发送真实消息
npm run day67:start
```

## 实验

1. 把 webhook payload 的签名改错，观察校验失败。
2. 对同一个 approval 重复提交决策，观察防重复处理。
3. 把 `approved` 改为 `rejected`，观察 run 进入回滚路径。

## 复盘

- HITL 不是只弹一个确认框，而是可审计的暂停、通知、决策和恢复状态机。
- webhook 决策必须校验签名、防重放、防重复处理。
- 人工批准不等于立即真实执行，仍要经过工具策略、沙盒和审计。
