# Day 54：MCP 接入验真 Agent

## 概念

这一节区分“URL 能访问”和“真实 MCP 协议可用”。根路径、`/health`、`/sse` 都不能直接当成 MCP 入口；必须验证 `/mcp`、initialize 和 `tools/list`。

## 代码结构

- `src/index.js`：mock MCP 探测结果、endpoint 构造和协议验真。
- `src/cli.js`：输出 MCP ready 和 wrong endpoint 两个 demo。
- `test/run.test.js`：验证 `/health`/`/sse` 不等于 MCP、`tools/list` 失败要暴露。

## 运行

```bash
# 用途：运行 MCP 接入验真 demo
# 执行目录：<项目根目录>/day54-mcp-integration-verifier
# 结果判断：ready.status 为 mcp-ready，wrongEndpoint.status 为 wrong-endpoint
# 风险：只读 mock，不注册全局 MCP、不访问真实服务
npm run demo
```

PowerShell：

```powershell
# 用途：在 Windows 上运行同一个 MCP 验真 demo
# 执行目录：<项目根目录>\day54-mcp-integration-verifier
# 结果判断：localOnly 为 true
# 风险：只读 mock，不修改 Codex 配置
npm run demo
```

## 实验

把 `candidatePath` 改成 `/health` 或 `/sse`，观察为什么状态是 `wrong-endpoint`。

## 复盘

MCP 接入要以协议证据为准。资源列表为空不一定失败，但 initialize 或 `tools/list` 失败必须继续查。
