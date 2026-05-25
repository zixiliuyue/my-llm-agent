# Day 05：Vue3 Web Agent

第五天把 CLI agent 包成本地 Web 体验：Vue3 + Vite 前端聊天界面，调用本地 Node agent API。

## 概念

- Web UI 是 agent 的交互壳，不应该隐藏 agent loop。
- 后端统一读取 `OLLAMA_HOST` / `OLLAMA_MODEL`，前端不直接接模型地址。
- Mock 模式让页面验证不依赖本地 Ollama。

## 运行

```bash
# 用途：安装 Vue3 + Vite 前端依赖
# 执行目录：<项目根目录>
# 输出判断：前端 node_modules 安装完成
# 风险：会下载 npm 依赖，不提交 node_modules
npm --prefix day05-vue-web-agent/frontend install
```

```bash
# 用途：启动本地 Agent API，mock 模式不调用 Ollama
# 执行目录：<项目根目录>
# 输出判断：监听 http://127.0.0.1:8787
# 风险：只启动本机服务
npm run day05:api -- --mock
```

Windows PowerShell 也使用同一个参数：

```powershell
# 用途：在 Windows 启动 mock API，不依赖 Ollama
# 执行目录：<项目根目录>
# 输出判断：监听 http://127.0.0.1:8787，日志显示 mock=on
# 风险：只启动本机服务
npm run day05:api -- --mock
```

```bash
# 用途：启动 Vue3 + Vite 前端
# 执行目录：<项目根目录>
# 输出判断：Vite 输出本地访问地址
# 风险：只启动本机开发服务
npm run day05:web
```

```bash
# 用途：构建前端
# 执行目录：<项目根目录>
# 输出判断：Vite build 成功
# 风险：生成 dist 构建产物
npm run day05:build
```

```bash
# 用途：测试 mock API 和 HTTP handler
# 执行目录：<项目根目录>
# 输出判断：看到 day05 tests passed
# 风险：只起本地临时端口，不调用 Ollama
npm run day05:test
```

## 代码入口

- `server/agent-api.js`：Node HTTP API 和 mock agent response。
- `server/index.js`：本地 API server。
- `frontend/src/App.vue`：聊天界面，展示 tool call、observation、final。

## 复盘

Web 阶段的核心不是做复杂页面，而是把 agent loop 的过程可视化，帮助理解每一步为什么发生。
