# Day 69 - Observability OTel Runtime

## 概念

这一日把结构化日志、Prometheus 指标和 OpenTelemetry/Jaeger trace 接入 Agent Runtime。默认使用内存 exporter，不启动 Prometheus 或 Jaeger。

## 代码结构

- `src/index.js`：内存 logger、meter、tracer、Prometheus 文本和 Jaeger payload。
- `src/cli.js`：输出一次带 trace 的 Agent run。
- `test/run.test.js`：覆盖日志、指标、trace 关联和 exporter payload。

## 运行

```bash
# 用途：运行 day69 可观测 Agent demo
# 执行目录：项目根目录
# 结果判断：输出 logs、prometheus、jaeger，traceId 在 root/tool span 中一致
# 风险：只用内存 exporter，不启动 Jaeger/Prometheus
npm run day69:start
```

## 实验

1. 增加一个失败工具调用，观察 `agent_tool_calls_total{status="error"}`。
2. 给 span 增加 `tenant`、`model`、`toolName` 属性，观察 Jaeger tags。
3. 把 Prometheus 文本接入真实 `/metrics` HTTP endpoint。

## 复盘

- 日志回答“发生了什么”，指标回答“趋势是否异常”，trace 回答“一次 run 卡在哪里”。
- Agent 观测指标要覆盖 run、tool call、provider、RAG、approval 和 sandbox。
- traceId 应贯穿模型调用、工具调用和最终报告，方便复盘。
