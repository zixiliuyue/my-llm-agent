# Day 41：SRE 排障 Agent

## 概念

这一节把 Agent 用在生产排障训练上：先收集指标、日志、发布和依赖证据，再生成假设和下一步动作。模型不能凭空猜原因，所有结论都必须引用证据。

## 代码结构

- `src/index.js`：mock 运维快照、证据收集、假设生成和排障报告。
- `src/cli.js`：输出一份本地排障 demo。
- `test/run.test.js`：验证高错误率、依赖退化和近期发布能进入报告。

## 运行

```bash
# 用途：运行 SRE 排障 agent demo
# 执行目录：<项目根目录>/day41-ops-diagnosis-agent
# 结果判断：输出 evidence、hypotheses、nextActions
# 风险：只读 mock，不访问真实 Prometheus/Grafana/日志系统
npm run demo
```

PowerShell：

```powershell
# 用途：在 Windows 上运行同一个排障训练 demo
# 执行目录：<项目根目录>\day41-ops-diagnosis-agent
# 结果判断：localOnly 为 true
# 风险：只读 mock，不访问远程环境
npm run demo
```

## 实验

把 `createMockOpsSnapshot` 里的 error rate、日志关键字、发布记录改掉，观察假设排序如何变化。

## 复盘

对你的工作场景来说，Agent 的价值不是替代排障，而是稳定执行“先拿证据、再形成假设、最后给动作”的链路。
