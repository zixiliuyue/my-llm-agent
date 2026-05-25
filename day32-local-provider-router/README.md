# Day 32：本地 Provider 路由

## 概念

Agent 不应该让模型自由决定调用哪个后端。这里用确定性注册表描述三类本地能力：`ollama:text`、`comfy:image`、`framepack:video`。路由代码会拒绝远程地址，保证学习项目不会误调用云服务。

## 代码结构

- `src/index.js`：本地 provider 注册表、地址校验和任务类型路由。
- `src/cli.js`：输出默认路由 JSON。
- `test/run.test.js`：覆盖本地地址、远程地址拒绝和三类任务选择。

## 运行

```bash
# 用途：查看默认 provider 路由
# 执行目录：<项目根目录>/day32-local-provider-router
# 结果判断：text/image/video 分别路由到本地 provider
# 风险：只读，不会访问模型服务
npm run demo
```

PowerShell：

```powershell
# 用途：指定 Windows 本机 FramePack 地址后查看路由
# 执行目录：<项目根目录>\day32-local-provider-router
# 结果判断：framepack:video 仍然只接受 localhost
# 风险：只读，不会启动服务
$env:FRAMEPACK_HOST="http://127.0.0.1:7860"; npm run demo
```

## 实验

把 `OLLAMA_HOST` 改成云端地址会直接报错；把它改成 `http://127.0.0.1:11434` 才能通过。

## 复盘

LLM 可以写 prompt、做总结，但 provider 选择、地址白名单和安全边界必须由代码控制。
