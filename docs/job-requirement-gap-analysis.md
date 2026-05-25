# Agent 岗位要求缺口分析

本文件按用户提供的两张招聘截图评估当前仓库。两份岗位都强调：把 Agent 从“想法/原型”做成可运行、可测量、可复盘、可上线、可持续优化的系统，而不是只会调用模型。

## 岗位要求提炼

### 截图 1：创始工程师 / AI Agents

核心要求：

- 设计完整智能体系统架构：运行时、编排层、上下文工程、安全边界。
- 把模型涌现能力变成确定可靠的产品体验。
- 构建 Agent Runtime：思考、执行、验证、从错误中恢复。
- 构建记忆与上下文架构，让 AI 在有限注意力下做出更好决策。
- 构建复杂全栈自主 Agent 的安全沙盒。
- 设计多 Agent 编排：任务分解、并发执行、结果聚合。
- 设计可观测与评估体系，衡量并改善智能体可靠性。
- 有生产级智能体系统或复杂分布式系统经验。
- 能在 TypeScript、Python、Bash 等多语言环境高效构建。
- 加分：Agent 自我进化、多 Agent 编排、MCP server 生产经验。

### 截图 2：AI Agent 工程师

核心要求：

- 把未被证明的体验设想做成可运行、可测量、可上线的端到端原型和实验。
- 构建可运行的 Agent 核心链路，让想法可以跑、可以测、可以复盘。
- 从 0 到 1 推动探索链路，并对方向是否成立给出工程判断。
- 设计 Agent Runtime：稳定、可维护、可演进。
- 设计 Agent Harness：可测试、可评估、可回放、可比较。
- 把需求变成可执行的 agent spec，把模型能力变成稳定系统能力。
- 推动技术路线：工具协议、记忆方案、评测口径、发布和灰度机制。
- 扎实软件工程能力：架构设计、可靠性、可观测、性能与成本优化、可维护性。
- 加分：Agent/Workflow 系统、多工具编排、函数调用/插件体系、任务队列和调度、长期任务与状态恢复。
- 加分：RAG/知识库工程：索引、召回、重排、缓存、增量更新、评测与可观测。
- 加分：多模态 Agent：图像、语音、视频，或内容/搜索/推荐场景 agent 化。

## 当前仓库覆盖情况

| 要求 | 当前仓库证据 | 覆盖度 |
|---|---|---|
| Agent loop / 工具调用 / 协议恢复 | day01、day04 | 已覆盖教学级 |
| 多 Agent 入门与工程闭环 | day02、day56、day62 | 已覆盖入门、capstone 和 DAG 编排 |
| 生产级 Runtime | day57 | 已覆盖教学版 API/worker/storage/lease/状态恢复 |
| Agent Harness | day06、day55、day58 | 已覆盖 eval 入门、复盘质量和 replay/compare/CI gate |
| 生产级 RAG / 知识库 | day03、day19、day59 | 已覆盖从本地检索到 RAG pipeline |
| 端到端产品原型 | day05、day30、day60 | 已覆盖 Web/API 和 Agent Ops Console 样板 |
| API / Web / Gateway | day05、day08、day09、day14、day15、day60 | 已覆盖基础链路和最终产品控制台 |
| 工具策略 / 审批 / 安全边界 | day13、day24、day42、day43、day48、day61 | 已覆盖 dry-run、审批和安全沙盒策略 |
| MCP / Plugin / Skill | day16、day17、day18、day44、day54 | 已覆盖 mock server 和协议验真 |
| 任务队列 / 后台任务 | day20、day25、day34、day57、day62 | 已覆盖长期任务、lease、恢复和 DAG 调度 |
| 可观测 / 评估 | day06、day28、day41、day46、day55、day58、day60 | 已覆盖 trace、dashboard、harness、evidence board |
| 发布验证 / 灰度 / 回滚 | day49、day63 | 已覆盖发布验证、版本、shadow、canary、gray、rollback |
| 多模型 Provider 路由 | day12、day31、day32、day64 | 已覆盖基础路由、本地 provider 和生产级 fallback/cost |
| 本地多模态生成与评估 | day31-day40 | 已覆盖本地生成、队列、资产和视频模型评估 |
| 多模态理解 | day65 | 已覆盖 caption、OCR、质量、PII/EXIF、语音、视频关键帧和 eval |
| 沙盒执行器 | day61、day66 | 已覆盖策略和执行器 dry-run/VM/容器规格 |
| HITL 人工闭环 | day43、day67 | 已覆盖审批链和 webhook 决策状态机 |
| 真实依赖集成测试 | day57、day60、day68 | 已覆盖 Compose 草案、配置 schema、Postgres/Redis/MinIO 计划 |
| OTel/Prometheus/Jaeger | day28、day69 | 已覆盖 dashboard 入门和 Runtime 日志/指标/trace exporter |
| CI Eval Gate | day58、day70、`.github/workflows/agent-eval.yml` | 已覆盖 harness gate 和 GitHub Actions workflow |
| Agent 通信协议 | day02、day62、day71 | 已覆盖多 agent 入门、DAG 编排和 mini-acp/JSON-RPC/pub-sub |

## day57-day65 补齐结果

| Day | 新增能力 | 对应岗位要求 |
|---|---|---|
| day57 | run/session/tool_call/evidence 持久化模型、worker lease、取消、重试、超时、恢复、幂等、并发控制、Docker Compose 草案 | Agent Runtime、长期任务、状态恢复 |
| day58 | replay、compare、golden dataset、tool-call accuracy、groundedness、latency/cost/recovery、CI gate | Agent Harness、可测试、可评估、可回放、可比较 |
| day59 | Markdown/HTML/PDF placeholder parse、chunk、embedding、hybrid search、rerank、citation、权限过滤、缓存、增量更新、召回评估 | RAG/知识库工程 |
| day60 | 用户输入到 run、tool approval、RAG citation、evidence board、final report、OpenAPI、health/metrics、前端控制台、Docker Compose 草案 | 可运行、可测量、可上线的端到端原型 |
| day61 | prompt injection、tool output trust boundary、PII/secret scanning、网络/文件/MCP/tool allowlist、dry-run sandbox spec、audit log | 真实安全沙盒、安全边界 |
| day62 | DAG/graph、fan-out/fan-in、共享状态冲突、partial failure、预算、超时、取消 | 多 Agent 编排、任务分解、并发执行、结果聚合 |
| day63 | prompt/model/tool/spec 版本、shadow run、canary eval、灰度比例、指标触发回滚、release note | 发布、灰度、版本管理 |
| day64 | OpenAI/Claude/Qwen/Ollama 统一 provider、streaming、tool calling、JSON schema、retry、timeout、rate limit、cost、fallback | 多模型 Provider 生产路由 |
| day65 | 图片 caption/OCR/object/quality/NSFW/PII/EXIF、语音转写、视频关键帧、多模态 eval | 多模态 Agent 理解 |

## day66-day71 补齐结果

| Day | 新增能力 | 对应岗位要求 |
|---|---|---|
| day66 | 不受信任 JS/Python 代码检查、Node VM timeout、Docker sandbox dry-run spec、CPU/内存/网络/文件隔离参数 | 真实安全沙盒、代码解释器限制 |
| day67 | HITL 暂停、通知、webhook payload、签名校验、防重复、继续或回滚状态机 | 端到端人工审批闭环 |
| day68 | dotenv/schema 配置、Docker Compose/Testcontainers 风格计划、Postgres/Redis/MinIO health check 和断言 | 真实依赖集成测试、生产配置管理 |
| day69 | 结构化日志、Prometheus 指标、Jaeger/OTel trace payload、tool call latency/error 指标 | 完整可观测性堆栈 |
| day70 | baseline/current eval compare、Markdown 报告、CI 退出码、GitHub Actions workflow | Agent 评估与持续集成 |
| day71 | mini-acp envelope、JSON-RPC request/response、pub/sub broker、correlationId 和审计 | 多 Agent 通信协议 |

## 仍然需要诚实说明的边界

- day57 和 day60 提供 Docker Compose 草案，但默认测试仍使用内存 adapter；如果要证明真实生产部署，还需要实际 API server、Postgres schema migration、Redis worker 和压测结果。
- day59 使用 deterministic embedding 和 in-memory vector store；真实场景需要接 pgvector/Qdrant/Milvus、真实 embedding、权限数据源和离线评测集。
- day61 是 dry-run 沙盒策略；真实隔离还需要容器 runtime、egress proxy、seccomp/AppArmor、secret manager 和宿主审计。
- day64 默认 mock provider；真实 OpenAI/Claude/Qwen/Ollama 接入需要密钥管理、真实 streaming、错误分类和 provider 观测。
- day65 默认 mock 多模态 adapter；真实模型需要 Windows 5060 Ti 机器上的本地 vision/audio/video 服务替换。
- day66 默认 Node VM + Docker dry-run，不等价于生产 nsjail/gVisor/Docker 动态容器执行。
- day68 默认不启动真实 Docker；要证明真实依赖集成，需要在 Docker 可用环境跑 compose 或 Testcontainers。
- day69 默认内存 exporter；真实 Jaeger/Prometheus/OpenTelemetry Collector 需要单独部署。
- day70 使用 mock baseline/current；真实 CI 应从固定 golden dataset 和历史 artifact 读取指标。
- day71 默认内存 broker；真实生产需要 NATS/Redis/Kafka/gRPC 的连接、鉴权、重试和死信队列。
- 仓库仍以 Node/npm 教学为主，Python/Go/Java 的生产 worker 示例还可以作为后续 P2 扩展。

## 当前结论

day01-day56 能证明“理解 Agent 工程化主线”；day57-day65 补上岗位截图最关注的生产级证据；day66-day71 继续补齐真实生产环境常见追问：真实依赖、OTel、CI、沙盒执行器、HITL 和通信协议。

现在这个仓库已经可以作为面试展示入口，但展示时要说清：默认测试是 mock/内存/dry-run，真实服务能力通过 day57/day60 Docker 草案、day59 pgvector 草案、day64 provider 替换点和 day65 本地多模态替换点继续落地。
