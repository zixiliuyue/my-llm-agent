# mini-openclaw 45 天学习项目

这个仓库从 LLM-Agent 基础逐步演化到教学版 mini-openclaw。每一天都是完全自包含的小项目：有自己的 `package.json`、`README.md`、`src/` 和 `test/`，源码不 import 其它 day，方便学习过程中随意修改某一天代码。

## 45 天路线

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

## 快速验证

```bash
# 用途：运行 day01-day45 的 mock/unit 测试
# 执行目录：<项目根目录>
# 输出判断：每个 day 打印 tests passed，最终退出码为 0
# 风险：不调用真实模型、不部署、不执行远程命令
npm test
```

```bash
# 用途：一键跑通 45 天 start 示例、单元测试、Web build 和 day05 真实模型 API
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

## 教程补充材料

| 文档 | 用途 |
|---|---|
| `docs/learning-map.md` | 按学习目标选择最短路径、完整平台路径或多模态路径。 |
| `docs/checkpoints.md` | 每 5 天一组实战验收题，确认不是只跑过测试。 |
| `docs/windows-5060ti-local-runbook.md` | Win10 + RTX 5060 Ti 16G 真实运行前的手动检查顺序。 |
| `docs/failure-labs.md` | 故意制造常见错误，学习如何从输出判断下一步。 |
| `docs/local-multimodal-e2e.md` | day31-day40 端到端 mock 链路和真实服务替换点。 |

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
day41-day45 的默认测试只使用 mock 指标、mock 权限、dry-run 命令、mock MCP 和 mock 事故上下文，不访问真实生产系统。

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
