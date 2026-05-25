# 5 分钟演示脚本

## 0:00 - 0:30 项目定位

这是一个 71 天自包含 Agent 工程学习仓库，从 agent loop 到生产级 Runtime、Harness、RAG、端到端产品样板、安全沙盒、发布灰度、多模型路由、多模态理解、HITL、OTel、CI gate 和通信协议。

## 0:30 - 1:15 环境与跨平台

```bash
npm run doctor
```

讲解点：Mac 默认跑 mock 和轻量模型；Win10 + RTX 5060 Ti 16G 用 Ollama、ComfyUI、FramePack 等本地服务替换 mock。

## 1:15 - 2:00 Runtime 和 Harness

```bash
npm run day57:start
npm run day58:gate
```

讲解点：run/session/tool_call/evidence 持久化、worker lease、恢复、replay、compare、CI gate。

## 2:00 - 2:45 RAG 和端到端产品

```bash
npm run day59:rag
npm run day60:start
npm run day60:build
```

讲解点：hybrid search、citation、权限过滤、Agent Ops Console、approval、evidence board、final report。

## 2:45 - 3:45 安全、编排和发布

```bash
npm run day61:start
npm run day62:start
npm run day63:start
```

讲解点：prompt injection、tool output trust boundary、DAG、fan-out/fan-in、灰度和回滚。

## 3:45 - 4:30 模型路由和多模态

```bash
npm run day64:start
npm run day65:start
```

讲解点：provider fallback、JSON schema、cost 统计、图片/语音/视频理解和 eval。

## 4:30 - 5:00 总结

这套项目的重点是把 Agent 能力放进工程系统：证据、权限、审批、可观测、评估、回滚和复盘。默认 mock 是为了可复现和安全，真实服务通过 Docker/provider/本地模型替换点接入。

## 扩展演示：生产环境追问

```bash
npm run day66:start
npm run day67:start
npm run day68:start
npm run day69:start
npm run day70:ci
npm run day71:start
```

讲解点：不受信任代码沙盒、HITL webhook、Postgres/Redis/MinIO 集成计划、Prometheus/Jaeger/OTel、GitHub Actions eval gate、JSON-RPC/pub-sub 通信协议。
