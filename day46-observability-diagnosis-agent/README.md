# Day 46：Grafana/Prometheus 观测诊断 Agent

## 概念

这一节训练 Agent 先判断观测链路是否可信，再判断业务服务是否故障。Grafana 403、Prometheus 数据不新鲜、render 返回 HTML 错页，都不能直接当成业务服务异常。

## 代码结构

- `src/index.js`：mock Grafana、Prometheus、日志、trace 和发布信号，并生成诊断结论。
- `src/cli.js`：输出一份本地观测诊断 demo。
- `test/run.test.js`：验证权限故障、数据源过期和服务退化的判断。

## 运行

```bash
# 用途：运行观测诊断 demo
# 执行目录：<项目根目录>/day46-observability-diagnosis-agent
# 结果判断：输出 evidence、hypotheses、nextQueries
# 风险：只读 mock，不访问真实 Grafana/Prometheus/日志系统
npm run demo
```

PowerShell：

```powershell
# 用途：在 Windows 上运行同一个观测诊断 demo
# 执行目录：<项目根目录>\day46-observability-diagnosis-agent
# 结果判断：localOnly 为 true
# 风险：只读 mock，不访问远程环境
npm run demo
```

## 实验

把 `grafana.status` 改成 `403`，再把 `metrics.prometheusFresh` 改成 `false`，观察 Agent 是否先提示修观测链路。

## 复盘

真实工作里，观测工具本身也可能坏。好的 Agent 不能看到图表空白就直接说服务挂了，而要先分清权限、数据源和业务信号。
