# Agent 工程岗位面试作品集入口

这份文档用于把两张岗位截图里的要求，快速映射到本仓库可展示的代码、命令和讲解点。

## 30 秒定位

本仓库不是“只调用模型”的 demo，而是一套 71 天自包含 Agent 工程学习项目。它从 agent loop、工具调用、RAG、Web/API、MCP、权限、安全、观测、发布，逐步扩展到生产级 Runtime、Harness、端到端产品样板、多模态理解、沙盒执行器、HITL、OTel、CI gate 和通信协议。

## 岗位能力映射

| 岗位要求 | 仓库证据 | 演示命令 |
|---|---|---|
| Agent core loop | day01、day04 | `npm run day01:test` |
| 多 Agent 协作 | day02、day56、day62 | `npm run day62:start` |
| Runtime | day10、day20、day25、day57 | `npm run day57:start` |
| Harness / Eval / Replay | day06、day55、day58 | `npm run day58:gate` |
| RAG / 知识库 | day03、day59 | `npm run day59:rag` |
| 端到端产品原型 | day05、day30、day60 | `npm run day60:start` / `npm run day60:build` |
| 安全沙盒 | day13、day24、day43、day48、day61 | `npm run day61:start` |
| 发布灰度 | day49、day63 | `npm run day63:start` |
| 多模型路由 | day12、day32、day64 | `npm run day64:start` |
| 多模态 Agent | day31-day40、day65 | `npm run day65:start` |
| 沙盒执行器 | day61、day66 | `npm run day66:start` |
| HITL 人工闭环 | day43、day67 | `npm run day67:start` |
| 真实依赖集成 | day57、day60、day68 | `npm run day68:start` |
| OTel 可观测 | day28、day69 | `npm run day69:start` |
| CI Eval Gate | day58、day70、`.github/workflows/agent-eval.yml` | `npm run day70:ci` |
| Agent 通信协议 | day02、day62、day71 | `npm run day71:start` |

## 推荐展示顺序

1. `npm run doctor`：说明跨 Mac / Win10 + 5060 Ti 的只读环境检查。
2. `npm run day57:start`：展示 Runtime 状态、lease、tool_call、evidence。
3. `npm run day58:gate`：展示 replay/compare/CI gate。
4. `npm run day59:rag`：展示 RAG citation 和权限过滤。
5. `npm run day60:build`：展示 Agent Ops Console。
6. `npm run day61:start`：展示 prompt injection 和沙盒策略。
7. `npm run day63:start`：展示灰度和回滚。
8. `npm run day66:start`：展示不受信任代码执行器和 Docker sandbox spec。
9. `npm run day67:start`：展示 HITL webhook 决策闭环。
10. `npm run day69:start` / `npm run day70:ci`：展示 OTel 和 CI eval gate。

## 面试时要主动说明的边界

- 默认测试不访问真实生产系统，避免把学习仓库变成危险工具。
- Docker Compose 是显式演示路径，不纳入默认 `npm test`。
- 真实模型 provider、pgvector、多模态模型都保留替换点，但默认用 mock 保证可复现。
- 模型只负责生成、总结和分类；权限、路由、执行、回滚、SQL、安全策略都由确定性代码判断。
