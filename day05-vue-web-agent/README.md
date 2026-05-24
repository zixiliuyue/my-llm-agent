# Day 05：Vue3 Web Agent

第五天把 CLI agent 包成一个本地 Web 体验：Vue3 + Vite 前端聊天界面，调用本地 Node agent API。

## 学习目标

- 理解 Web UI 只是 agent 的一层交互壳。
- 把 CLI 的 agent loop 复用到 HTTP API。
- 在页面上展示 message、tool call、observation 和 final。

## 技术方向

- 前端：Vue3 + Vite。
- 后端：Node 内置 HTTP server 或轻量 fetch handler。
- 模型：继续通过 `OLLAMA_HOST` 调 Ollama。
- 不在本阶段引入数据库、登录或复杂部署。

## 建议实现步骤

1. 新建 `frontend/`，使用 Vue3 + Vite。
2. 新建 `server/`，暴露 `/api/agent`。
3. API 返回结构化事件流或分步 JSON。
4. 前端用时间线展示 tool call 和 observation。
5. 保留 CLI 入口，避免 Web 成为唯一调试方式。

## 验收标准

- 页面可以输入问题并看到最终答案。
- 页面能区分模型消息、工具调用、工具结果。
- 后端测试不依赖真实模型，可以用 mock client。
- 前端构建通过。

## 常见坑

- 不要做营销 landing page，第一屏就是可用聊天界面。
- 不要让 UI 隐藏 agent loop，工具过程要可见。
- 不要把 Ollama 地址写死在前端，后端统一读取环境变量。
