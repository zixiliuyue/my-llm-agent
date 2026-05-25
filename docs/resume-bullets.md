# 简历项目描述素材

## 中文版本

- 设计并实现 65 天自包含 LLM Agent 工程学习项目，从 agent loop、工具调用、RAG、MCP、Web/API、可观测与权限审批，扩展到生产级 Runtime、Harness、端到端 Agent Ops Console、安全沙盒、灰度发布、多模型路由和多模态理解。
- 实现教学版生产 Agent Runtime，覆盖 run/session/tool_call/evidence 状态模型、worker lease、取消、重试、超时、恢复、幂等和并发控制，并提供 Docker Compose 演示草案。
- 构建 Agent Harness，支持固定 run snapshot replay、prompt/model/tool 版本 compare、golden dataset、tool-call accuracy、groundedness、latency/cost/recovery rate 指标和 CI gate。
- 实现生产 RAG pipeline 教学版，覆盖 Markdown/HTML/PDF placeholder 解析、chunk、deterministic embedding、hybrid search、rerank、citation、权限过滤、缓存、增量更新、删除和 recall eval。
- 构建端到端 Agent Ops 产品样板，串联用户目标、agent run、tool approval、RAG citation、evidence board、eval report 和 incident final report，并提供静态前端控制台。
- 设计 Agent 安全沙盒策略，覆盖 prompt injection、tool output trust boundary、PII/secret scanning、网络/文件/tool/MCP allowlist、dry-run 容器规格和 audit log。
- 实现多模型 Provider Router，统一 OpenAI/Claude/Qwen/Ollama 接口，支持 streaming、tool calling、JSON schema、retry、timeout、rate limit、token/cost 统计和 fallback。

## English Version

- Built a 65-day self-contained LLM Agent engineering curriculum covering agent loops, tool calling, RAG, MCP, Web/API, observability, permission-aware tooling, production runtime, eval harness, sandboxing, release control, model routing, and multimodal understanding.
- Implemented a teaching production Agent Runtime with run/session/tool_call/evidence state models, worker leases, cancellation, retries, timeouts, recovery, idempotency, and concurrency control.
- Built an Agent Harness for replay, version comparison, golden datasets, tool-call accuracy, groundedness, latency/cost/recovery metrics, and CI quality gates.
- Designed a production-style RAG pipeline with parsing, chunking, deterministic embeddings, hybrid search, reranking, citations, permission filtering, caching, incremental updates, deletion, and recall evaluation.
- Created an end-to-end Agent Ops prototype with run timeline, human approval, RAG citations, evidence board, eval report, incident final report, and a static operations console.

## 面试展开点

- 为什么模型不能直接决定权限、远程执行、SQL 或发布回滚。
- 如何把 mock/dry-run 教学版替换成 Postgres、Redis、pgvector、真实 provider 和本地多模态模型。
- 如何在 Win10 + RTX 5060 Ti 16G 上选择 `qwen2.5:7b`、`qwen2.5-coder:14b`、SDXL、FLUX schnell、FramePack 等本地路径。
