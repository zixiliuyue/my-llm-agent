# Day 56：完整多 Agent 工程闭环 Capstone

## 概念

这一节是最终 capstone：day02 仍然是“多 agent 入门”，day56 则把 day41-day55 的生产工程能力串成一个完整闭环。coordinator 不直接执行动作，而是按顺序把任务交给观测、权限、安全、SQL、MCP 和复盘 agent，最后汇总 evidence board 和人工审阅结论。

所有外部系统都是 mock snapshot：不访问真实 Grafana、Prometheus、Redis、SSH、数据库、MCP server 或事故系统。

## 代码结构

- `src/index.js`：完整多 agent 闭环、mock 输入、handoff、证据板和最终结论。
- `src/cli.js`：输出固定 JSON 字段的 capstone demo。
- `test/run.test.js`：验证 happy path、权限阻断、高危命令、SQL 边界、MCP 验真和复盘质量。

## 运行

```bash
# 用途：运行完整多 Agent 工程闭环 demo
# 执行目录：<项目根目录>/day56-complete-multi-agent-ops-closure
# 结果判断：输出 day、agents、handoffs、evidenceBoard、decision、finalReport
# 风险：只读 mock，不访问真实系统，不执行命令，不连接数据库
npm run demo
```

根目录快捷命令：

```bash
# 用途：从项目根目录运行 day56 capstone
# 执行目录：<项目根目录>
# 结果判断：decision.status 为 ready-for-human-review
# 风险：只读 mock/dry-run
npm run day56:capstone
```

PowerShell：

```powershell
# 用途：在 Windows 上运行同一个完整多 Agent 闭环 demo
# 执行目录：<项目根目录>\day56-complete-multi-agent-ops-closure
# 结果判断：localOnly 为 true，finalReport.audit.externalCalls 为 0
# 风险：只读 mock，不访问真实服务
npm run demo
```

## 实验

1. 把 `permission.redisUserPermission` 改成 `null`，观察 coordinator 如何停止安全、SQL、MCP 和复盘阶段。
2. 把 `safety.command` 改成 `rm -rf /`，观察 safety-agent 如何直接 blocked。
3. 把 `mcp.candidatePath` 改成 `/health` 或 `/sse`，观察 endpoint 可访问但协议验真失败。
4. 把 `retro.prevention` 清空或把 `rawText` 改成 `token=secret`，观察最终报告为什么不能 ready。

## 复盘

完整多 agent 示例的重点不是 agent 数量，而是边界：模型可以生成判断和草案，但权限、执行、SQL、MCP 协议验真和复盘质量都必须由确定性代码约束。最终输出要能被人审计，不能让 agent 自己越权执行。
