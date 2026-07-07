# mini-openclaw 71 天学习项目

这个仓库从 LLM-Agent 基础逐步演化到教学版 mini-openclaw。每一天都是完全自包含的小项目：有自己的 `package.json`、`README.md`、`src/` 和 `test/`，源码不 import 其它 day，方便学习过程中随意修改某一天代码。

> **安全声明**：本仓库为教学项目。代码中出现的所有服务地址（默认 `127.0.0.1`）、数据库/对象存储凭证（如 `agent`、`minioadmin`）和邮箱（`@example.com`）均为本地 mock 或演示占位符，**不是真实凭证，禁止用于生产环境**。真实部署时请务必通过环境变量（`.env`）注入自己的地址与密钥，并保证不将其提交到版本库。

## 71 天路线

| Day | 目录 | 主题 | 入口 |
|---|---|---|---|
| 1 | `day01-single-agent-cli` | 单体 agent loop + 工具调用 | `npm run day01:start` / `npm run day01:test` |
| 2 | `day02-multi-agent-cli` | planner/tool-runner/critic/writer 多 agent 协作 | `npm run day02:start` / `npm run day02:test` |
| 3 | `day03-memory-and-rag` | 本地 memory、chunk、检索、引用 | `npm run day03:start` / `npm run day03:test` |
| 4 | `day04-tools-and-mcp` | 工具注册、权限边界、MCP mock | `npm run day04:start` / `npm run day04:test` |
| 5 | `day05-vue-web-agent` | Vue3 + Vite Web UI + Node agent API | `npm run day05:start` / `npm run day05:test` |
| 6 | `day06-evaluation-observability` | eval cases、trace、耗时和调用统计 | `npm run day06:start` / `npm run day06:test` |
| 7 | `day07-deploy-and-test-env` | 本地/测试环境切换和部署 dry-run | `npm run day07:start` / `npm run day07:test` |
| 8 | `day08-http-gateway` | 最小 HTTP Gateway | `npm run day08:start` / `npm run day08:test` |
| 9 | `day09-websocket-gateway` | WebSocket Gateway 事件流 | `npm run day09:start` / `npm run day09:test` |
| 10 | `day10-jsonl-session-store` | JSONL session store | `npm run day10:start` / `npm run day10:test` |
| 11 | `day11-workspace-bootstrap` | workspace bootstrap | `npm run day11:start` / `npm run day11:test` |
| 12 | `day12-model-provider-router` | model provider router | `npm run day12:start` / `npm run day12:test` |
| 13 | `day13-tool-policy` | tool policy 和审批边界 | `npm run day13:start` / `npm run day13:test` |
| 14 | `day14-event-stream-ui` | 事件流 UI | `npm run day14:start` / `npm run day14:test` |
| 15 | `day15-webchat-session` | WebChat session | `npm run day15:start` / `npm run day15:test` |
| 16 | `day16-skills-loader` | skills loader | `npm run day16:start` / `npm run day16:test` |
| 17 | `day17-plugin-manifest` | plugin manifest | `npm run day17:start` / `npm run day17:test` |
| 18 | `day18-mcp-adapter-mock` | MCP adapter mock | `npm run day18:start` / `npm run day18:test` |
| 19 | `day19-file-memory-store` | file memory store | `npm run day19:start` / `npm run day19:test` |
| 20 | `day20-background-jobs` | background jobs | `npm run day20:start` / `npm run day20:test` |
| 21 | `day21-webhook-channel-adapter` | webhook channel adapter | `npm run day21:start` / `npm run day21:test` |
| 22 | `day22-mock-chat-channel` | mock chat channel | `npm run day22:start` / `npm run day22:test` |
| 23 | `day23-device-node-pairing` | device node pairing | `npm run day23:start` / `npm run day23:test` |
| 24 | `day24-sandbox-policy-dry-run` | sandbox policy dry-run | `npm run day24:start` / `npm run day24:test` |
| 25 | `day25-command-queue-steering` | command queue + steering | `npm run day25:start` / `npm run day25:test` |
| 26 | `day26-doctor-config-checker` | doctor/config checker | `npm run day26:start` / `npm run day26:test` |
| 27 | `day27-gateway-auth` | gateway auth | `npm run day27:start` / `npm run day27:test` |
| 28 | `day28-observability-dashboard` | observability dashboard | `npm run day28:start` / `npm run day28:test` |
| 29 | `day29-onboarding-cli` | onboarding CLI | `npm run day29:start` / `npm run day29:test` |
| 30 | `day30-mini-openclaw-integrated` | mini-openclaw integrated | `npm run day30:start` / `npm run day30:test` |
| 31 | `day31-local-runtime-doctor` | 本地运行环境检测 | `npm run day31:start` / `npm run day31:test` |
| 32 | `day32-local-provider-router` | 本地 provider 路由 | `npm run day32:start` / `npm run day32:test` |
| 33 | `day33-comfyui-text-to-image` | ComfyUI 文生图适配器 | `npm run day33:start` / `npm run day33:test` |
| 34 | `day34-image-job-queue-ui` | 图片任务队列 UI | `npm run day34:start` / `npm run day34:test` |
| 35 | `day35-prompt-to-image-agent` | prompt 到图片 agent | `npm run day35:start` / `npm run day35:test` |
| 36 | `day36-local-image-assets` | 本地图片资产元数据 | `npm run day36:start` / `npm run day36:test` |
| 37 | `day37-flux-or-sdxl-profile` | SDXL/FLUX 模型 profile | `npm run day37:start` / `npm run day37:test` |
| 38 | `day38-local-video-first-step` | 本地短视频第一步 | `npm run day38:start` / `npm run day38:test` |
| 39 | `day39-framepack-video-local` | FramePack 本地视频 profile | `npm run day39:start` / `npm run day39:test` |
| 40 | `day40-wan-video-evaluation` | Wan 视频模型评估 | `npm run day40:start` / `npm run day40:test` |
| 41 | `day41-ops-diagnosis-agent` | SRE 排障 agent | `npm run day41:start` / `npm run day41:test` |
| 42 | `day42-permission-aware-tools` | 权限感知工具调用 | `npm run day42:start` / `npm run day42:test` |
| 43 | `day43-remote-command-approval` | 远程命令审批链 | `npm run day43:start` / `npm run day43:test` |
| 44 | `day44-mcp-observability-server` | MCP 观测工具 server | `npm run day44:start` / `npm run day44:test` |
| 45 | `day45-agent-incident-report` | Agent 事故报告 | `npm run day45:start` / `npm run day45:test` |
| 46 | `day46-observability-diagnosis-agent` | Grafana/Prometheus 观测诊断 | `npm run day46:start` / `npm run day46:test` |
| 47 | `day47-permission-cache-debugger` | 权限缓存排障 | `npm run day47:start` / `npm run day47:test` |
| 48 | `day48-safe-remote-execution-agent` | 安全远程执行审批 | `npm run day48:start` / `npm run day48:test` |
| 49 | `day49-release-verification-agent` | 测试环境发布验证 | `npm run day49:start` / `npm run day49:test` |
| 50 | `day50-cli-tool-manifest-agent` | CLI 工具接入 manifest | `npm run day50:start` / `npm run day50:test` |
| 51 | `day51-config-hot-reload-diagnosis-agent` | 配置热更新诊断 | `npm run day51:start` / `npm run day51:test` |
| 52 | `day52-frontend-permission-route-checker` | 前端权限路由检查 | `npm run day52:start` / `npm run day52:test` |
| 53 | `day53-database-fix-sql-agent` | 数据库修复 SQL 生成 | `npm run day53:start` / `npm run day53:test` |
| 54 | `day54-mcp-integration-verifier` | MCP 接入验真 | `npm run day54:start` / `npm run day54:test` |
| 55 | `day55-incident-retro-quality-agent` | 事故复盘质量评估 | `npm run day55:start` / `npm run day55:test` |
| 56 | `day56-complete-multi-agent-ops-closure` | 完整多 Agent 工程闭环 Capstone | `npm run day56:start` / `npm run day56:test` |
| 57 | `day57-production-agent-runtime` | 生产级 Agent Runtime 教学版 | `npm run day57:start` / `npm run day57:test` |
| 58 | `day58-agent-harness-eval-replay` | Harness、Eval、Replay、Compare 和 CI gate | `npm run day58:start` / `npm run day58:test` |
| 59 | `day59-production-rag-knowledge-base` | 生产级 RAG / 知识库工程 | `npm run day59:start` / `npm run day59:test` |
| 60 | `day60-agent-platform-e2e-product` | 端到端 Agent Ops 产品样板 | `npm run day60:start` / `npm run day60:test` |
| 61 | `day61-agent-sandbox-security` | 安全沙盒、注入防御和审计 | `npm run day61:start` / `npm run day61:test` |
| 62 | `day62-multi-agent-orchestration-runtime` | DAG 多 Agent 编排 Runtime | `npm run day62:start` / `npm run day62:test` |
| 63 | `day63-agent-release-and-gray-control` | 发布、灰度、版本和回滚 | `npm run day63:start` / `npm run day63:test` |
| 64 | `day64-production-model-router` | 生产级多模型 Provider Router | `npm run day64:start` / `npm run day64:test` |
| 65 | `day65-multimodal-agent-understanding` | 多模态 Agent 理解和评估 | `npm run day65:start` / `npm run day65:test` |
| 66 | `day66-sandbox-executor` | 不受信任代码安全沙盒执行器 | `npm run day66:start` / `npm run day66:test` |
| 67 | `day67-human-loop` | Human-in-the-Loop 审批闭环 | `npm run day67:start` / `npm run day67:test` |
| 68 | `day68-real-dependency-integration` | Postgres/Redis/MinIO 真实依赖集成计划 | `npm run day68:start` / `npm run day68:test` |
| 69 | `day69-observability-otel-runtime` | OTel/Prometheus/Jaeger 可观测 Runtime | `npm run day69:start` / `npm run day69:test` |
| 70 | `day70-agent-eval-ci-gate` | GitHub Actions Agent Eval CI gate | `npm run day70:start` / `npm run day70:test` |
| 71 | `day71-agent-communication-protocol` | Agent 通信协议与 JSON-RPC/pub-sub | `npm run day71:start` / `npm run day71:test` |

## 快速验证

```bash
# 用途：运行 day01-day71 的 mock/unit 测试
# 执行目录：<项目根目录>
# 输出判断：每个 day 打印 tests passed，最终退出码为 0
# 风险：不调用真实模型、不部署、不执行远程命令
npm test
```

```bash
# 用途：一键跑通 71 天 start 示例、单元测试、Web build 和 day05 真实模型 API
# 执行目录：<项目根目录>
# 输出判断：最后打印 examples smoke passed，所有步骤为 OK
# 风险：会访问本地 Ollama，不执行远程命令或部署；脚本会清理生成的 dist
npm run examples:smoke
```

```bash
# 用途：在 macOS/Linux shell 中直接调用同一套 smoke runner
# 执行目录：<项目根目录>
# 输出判断：最后打印 examples smoke passed，所有步骤为 OK
# 风险：会访问本地 Ollama，不执行远程命令或部署
./scripts/run-all-examples.sh
```

```bash
# 用途：检查 Node、npm、Ollama、ComfyUI、FramePack、Python、模型目录和 Windows NVIDIA GPU 可见性
# 执行目录：<项目根目录>
# 输出判断：Node/npm 为 OK；Ollama 未启动或模型未拉取时会给出提示
# 风险：只读检查，不安装软件、不拉模型、不修改驱动
npm run doctor
```

```bash
# 用途：运行 day31-day40 本地多模态端到端 mock
# 执行目录：<项目根目录>
# 输出判断：输出 optimizedPrompt、comfyRequest、queue、asset、videoPlan、framepack、wan
# 风险：mock 流程，不访问真实模型服务，不生成图片或视频
npm run local:multimodal -- "一个本地 agent 平台封面图"
```

```bash
# 用途：运行最终完整多 Agent 工程闭环 capstone
# 执行目录：<项目根目录>
# 输出判断：decision.status 为 ready-for-human-review，finalReport.audit.externalCalls 为 0
# 风险：mock/dry-run，不访问 Grafana/Redis/SSH/数据库/MCP/事故系统
npm run day56:capstone
```

```bash
# 用途：运行新增生产级 Agent Runtime 到多模态理解的 day57-day65 回归
# 执行目录：<项目根目录>
# 输出判断：day57-day65 均打印 tests passed
# 风险：默认 mock/内存实现；Docker、真实 provider、真实多模态模型都不在默认测试中启动
npm run day57:test && npm run day58:test && npm run day59:test && npm run day60:test && npm run day61:test && npm run day62:test && npm run day63:test && npm run day64:test && npm run day65:test
```

```bash
# 用途：运行新增生产环境补强 day66-day71 回归
# 执行目录：<项目根目录>
# 输出判断：day66-day71 均打印 tests passed
# 风险：默认 mock/内存/dry-run；不启动 Docker、Prometheus、Jaeger、消息队列或外部通知
npm run day66:test && npm run day67:test && npm run day68:test && npm run day69:test && npm run day70:test && npm run day71:test
```

```bash
# 用途：构建 day60 Agent Ops 前端控制台
# 执行目录：<项目根目录>
# 输出判断：生成 day60-agent-platform-e2e-product/dist/index.html
# 风险：只生成 dist 构建产物，不启动服务
npm run day60:build
```

## 教程补充材料

| 文档 | 用途 |
|---|---|
| `docs/learning-map.md` | 按学习目标选择最短路径、完整平台路径或多模态路径。 |
| `docs/checkpoints.md` | 每 5 天一组实战验收题，确认不是只跑过测试。 |
| `docs/windows-5060ti-local-runbook.md` | Win10 + RTX 5060 Ti 16G 真实运行前的手动检查顺序。 |
| `docs/failure-labs.md` | 故意制造常见错误，学习如何从输出判断下一步。 |
| `docs/local-multimodal-e2e.md` | day31-day40 端到端 mock 链路和真实服务替换点。 |
| `docs/complete-multi-agent-capstone.md` | day56 完整多 Agent 工程闭环协作说明。 |
| `docs/job-requirement-gap-analysis.md` | 按两张 Agent 岗位截图要求对照当前仓库缺口。 |
| `docs/interview-portfolio.md` | 面试视角下把岗位要求映射到仓库证据。 |
| `docs/system-design-agent-platform.md` | Runtime、Harness、RAG、Sandbox、Release、Observability 总架构。 |
| `docs/demo-script.md` | 5 分钟演示脚本。 |
| `docs/resume-bullets.md` | 可放简历的项目描述。 |
| `docs/security-threat-model.md` | Agent 平台安全威胁模型。 |
| `docs/troubleshooting.md` | 本地模型、依赖、Docker、CI、权限、MCP、GPU 常见问题排查。 |

## 学习规则

- 每天只学习一个 mini-openclaw 能力点。
- 每个 day 都可以单独进入目录运行 `npm start` 和 `npm test`。
- 概念可以递进，代码不跨 day 引用。
- 所有真实模型、远程部署、shell 执行默认 mock 或 dry-run。
- Web day 只做教学用最小页面，重点展示事件和状态，不做复杂产品 UI。

## 本地模型默认值

```bash
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
COMFYUI_HOST=http://127.0.0.1:8188
FRAMEPACK_HOST=http://127.0.0.1:7860
```

默认测试不依赖 Ollama。只有显式运行真实模型示例时，才会访问 `OLLAMA_HOST`。
day31-day40 的默认测试也不依赖 ComfyUI、FramePack、SVD、FLUX 或 Wan；真实多模态实验需要你手动启动本机服务并准备模型。
day41-day71 的默认测试只使用 mock 指标、mock 权限、dry-run 命令、mock MCP、mock 事故上下文、mock 发布快照、mock CLI manifest、mock 配置快照、mock 前端路由、mock evidence board、内存 runtime、mock RAG、mock provider、mock 多模态 adapter、内存 HITL、内存 broker 和 dry-run sandbox，不访问真实生产系统。

Windows PowerShell 切换模型示例：

```powershell
# 用途：在 Win10 + 16G 显存机器上临时切换到更适合代码实验的 14B 模型
# 执行目录：<项目根目录>
# 结果判断：本次命令使用 qwen2.5-coder:14b；关闭窗口后环境变量失效
# 风险：会调用本机 Ollama，占用 GPU 显存和内存
$env:OLLAMA_MODEL="qwen2.5-coder:14b"; npm run day01:ask -- "解释一下这个 agent 示例"
```

RTX 5060 Ti 16G 建议默认用 `qwen2.5:7b` 学习，进阶代码实验再切到 `qwen2.5-coder:14b`；不建议把 32B 作为默认模型。
图片方向默认从 SDXL 开始，进阶再尝试 FLUX.1 schnell；视频方向先做 SVD/FramePack 短视频评估，Wan2.1 只作为候选评估，不作为 16G 显存默认路径。
