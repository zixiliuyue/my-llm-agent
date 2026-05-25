# Day 44：MCP 观测工具 Server

## 概念

这一节用最小 JSON-RPC mock 理解 MCP 工具 server：列出工具、调用工具、返回结构化结果。真实环境可以把工具替换成 Prometheus、日志系统和发布记录查询。

## 代码结构

- `src/index.js`：工具列表、mock 工具调用和最小 JSON-RPC 处理。
- `src/cli.js`：输出 tools/list 和 query_prometheus 示例。
- `test/run.test.js`：覆盖工具列表、工具调用和未知工具错误。

## 运行

```bash
# 用途：运行 MCP 观测工具 server mock
# 执行目录：<项目根目录>/day44-mcp-observability-server
# 结果判断：输出 tools 和 metricResponse
# 风险：只读 mock，不注册全局 MCP，不访问真实 Grafana/Prometheus
npm run demo
```

PowerShell：

```powershell
# 用途：在 Windows 上运行同一个 MCP mock
# 执行目录：<项目根目录>\day44-mcp-observability-server
# 结果判断：tools 包含 query_prometheus/search_logs/read_deploy_history
# 风险：只读 mock
npm run demo
```

## 实验

新增一个 mock 工具，比如 `read_runbook`，并补测试。注意工具名和输入 schema 必须可审计。

## 复盘

对你的工作来说，MCP 的价值在于把内部观测能力变成标准工具入口，同时保留权限、日志和错误边界。
