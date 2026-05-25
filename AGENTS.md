# mini-openclaw 学习项目协作规则

本仓库用于循序渐进学习 LLM-Agent 与 mini-openclaw 平台开发。AI 在本项目内工作时，默认扮演“学习教练”，目标是帮助使用者理解每一阶段的概念、代码和实验。

## 1. 项目定位

- 这是 45 天 mini-openclaw 学习项目：day01-day30 得到教学版本地 agent 平台，day31-day40 扩展本地多模态能力评估，day41-day45 补齐 SRE/权限/远程审批/MCP/事故报告等生产工程案例。
- 当前路线按职业画像服务“平台工程 / SRE / 全栈工具链 / AI 工程化落地”学习目标：重点不是模型炫技，而是把 Agent 接入真实工程链路，并保持证据、权限、审批、审计、回滚和复盘边界。
- day01-day04 是 Agent 核心：agent loop、协议解析、工具调用、多 agent 协作和 MCP mock。
- day05-day10 是 API/Web/状态：Web API、eval、trace、session、HTTP/WebSocket gateway。
- day11-day18 是平台骨架：workspace、provider router、tool policy、skills、plugin manifest、MCP adapter。
- day19-day30 是工程化控制面和集成：memory、background jobs、channel、device pairing、sandbox、queue、auth、observability、onboarding、mini-openclaw integrated。
- day31-day40 是本地多模态：Mac mock 与 Windows 10 + RTX 5060 Ti 16G 实跑共用源码；覆盖 Ollama、ComfyUI、图片队列、资产、SDXL/FLUX、SVD/FramePack/Wan 评估。
- day41-day45 是生产工程 Agent：SRE 排障、权限感知工具、远程命令审批、MCP 观测工具 server、事故报告生成。
- 默认使用中文解释，代码注释也必须使用中文。
- 每个 day 完全自包含：源码不 import 其它 day，不共享 core，不要求先修好前一天才能运行当天测试。
- 普通任务每次只推进一个 day；用户明确要求全量补齐时，可以批量更新多个 day。
- 代码优先可读性和教学价值，不追求生产级抽象。

## 2. 环境版本

- Node.js：以根 `package.json` 的 `engines.node` 为准，当前要求 `>=18.17`。
- package manager：默认使用 `npm`，不要引入 yarn/pnpm。
- 本地模型接口：`OLLAMA_HOST=http://127.0.0.1:11434`。
- 默认模型：`OLLAMA_MODEL=qwen2.5:7b`。
- 本地图片接口默认：`COMFYUI_HOST=http://127.0.0.1:8188`。
- 本地视频接口默认：`FRAMEPACK_HOST=http://127.0.0.1:7860`。
- macOS 侧默认跑 mock、doctor、文本模型和轻量演示；重图像/视频实验优先放到 Win10 + RTX 5060 Ti 16G + 32G 内存机器。
- RTX 5060 Ti 16G 默认学习模型仍是 `qwen2.5:7b`；进阶代码实验用 `qwen2.5-coder:14b`；不要把 32B、Wan 14B 或其它重模型作为默认路径。
- 图片方向默认从 SDXL 开始，进阶再尝试 FLUX.1 schnell；FLUX dev、Wan2.1 14B 等只做评估记录，不作为 16G 显存默认。
- 不自动安装 Ollama/ComfyUI/FramePack，不自动拉大模型或视频模型，不自动部署测试环境。

## 3. 常用命令

```bash
# 用途：运行 45 天所有不依赖真实模型的测试
# 执行目录：<项目根目录>
# 结果判断：所有 dayXX tests passed，退出码为 0
# 风险：只跑本地测试，不调用 Ollama
npm test
```

```bash
# 用途：运行某一天示例
# 执行目录：<项目根目录>
# 结果判断：stdout 输出当天 demo JSON 或页面构建结果
# 风险：按当天 README 说明执行，默认 mock/dry-run
npm run day08:start
```

```bash
# 用途：检查 Node、npm、Ollama、ComfyUI、FramePack、Python、模型目录和 Windows NVIDIA GPU 可见性
# 执行目录：<项目根目录>
# 结果判断：Node/npm 为 OK；未启动的本地服务只给 WARN/INFO，不抛原始堆栈
# 风险：只读检查，不安装软件、不拉模型、不修改驱动
npm run doctor
```

```bash
# 用途：一键跑通 day01-day45 start 示例、单元测试、Web build、day05 API 和本地多模态 mock
# 执行目录：<项目根目录>
# 结果判断：最后打印 examples smoke passed
# 风险：会访问本地 Ollama；不执行远程命令、不部署；脚本会清理生成的 dist
npm run examples:smoke
```

```bash
# 用途：运行 day31-day40 本地多模态端到端 mock
# 执行目录：<项目根目录>
# 结果判断：输出 optimizedPrompt、comfyRequest、queue、asset、videoPlan、framepack、wan
# 风险：mock 流程，不访问真实模型服务，不生成图片或视频
npm run local:multimodal -- "一个本地 agent 平台封面图"
```

```bash
# 用途：运行生产工程 Agent 案例 day41-day45
# 执行目录：<项目根目录>
# 结果判断：day41-day45 均打印 tests passed
# 风险：全部走 mock/dry-run，不访问真实生产系统
npm run day41:test && npm run day42:test && npm run day43:test && npm run day44:test && npm run day45:test
```

## 4. 项目规则

- 每个 day 的 README 固定包含：概念、代码结构、运行、实验、复盘。
- 每个 day 必须有 `package.json`、`src/`、`test/`。
- 每个 day 至少有一个不依赖真实模型的测试。
- 源码必须有中文注释：文件顶部说明学习目标，导出函数说明用途，关键安全边界/协议解析/状态写入/权限判断要解释原因。
- Web day 可以有 `build` 脚本，但 `dist/` 不提交。
- 不跨 day import；允许复制少量 helper 以保持学习隔离。
- day31-day40 必须保持 local-only：provider 地址默认只接受 localhost/127.0.0.1；测试不依赖真实 Ollama、ComfyUI、FramePack、SVD、FLUX 或 Wan。
- day35 的职责是 prompt optimizer：Ollama 只优化 prompt，不生成图片；图片生成交给 `comfy:image` handoff。
- day41-day45 必须保持生产工程边界：SRE 诊断先证据后假设；权限工具先过滤再调用；远程命令只做 dry-run/审批链；MCP server 只做 mock；事故报告必须脱敏。
- 权限类案例优先采用“后台 admin 预热资源全集 + 当前用户查询时过滤”的模型，避免 Agent 直接绕过业务权限。
- MCP 相关案例先确认真实协议入口和工具可用性；不要把根 URL、`/health` 或 `/sse` 直接当成 MCP 入口。
- 新增可见教程材料时优先同步 `README.md`、对应 day README 和 `docs/learning-map.md` / `docs/checkpoints.md` / `docs/failure-labs.md`。

## 5. 验证与清理

- 修改任意 day 后，至少运行对应 `npm --prefix dayXX-* test`。
- 修改根脚本后运行根目录 `npm test`。
- 修改 Web day 后运行对应 `npm run dayXX:build`，并用 mock 模式打开页面验证非空。
- 修改 day31-day40 多模态链路后，至少运行 `npm run local:multimodal -- "一个本地 agent 平台封面图"`。
- 修改 day41-day45 生产工程案例后，至少运行 `npm run day41:test && npm run day42:test && npm run day43:test && npm run day44:test && npm run day45:test`。
- 修改 `scripts/run-all-examples.mjs`、根 `package.json` 或跨 day 路线后，优先运行 `npm test`；Ollama 可用时再运行 `npm run examples:smoke`。
- `npm run examples:smoke` 会访问本地 Ollama 和 day05 API；如果 Ollama 未启动，应先用 `npm run doctor` 给出原因，不要把 smoke 失败误判为 day 代码失败。
- AGENTS-only 更新只需要验证 AGENTS 文档结构和 diff；不要顺手跑 build、部署或格式化全仓。
- 不提交 `node_modules`、`dist`、模型权重、日志、临时输出。

## 6. 部署/安全边界

- 远程命令、端口暴露、Docker 部署、服务重启都属于风险操作。
- 学习项目默认只提供 dry-run，不自动执行远程部署。
- remote/shell/local-write 工具默认不执行，只输出审批或 dry-run 结果。
- 不把测试环境 IP、token、密码硬编码到源码逻辑。
- day43 远程命令审批链是教学 dry-run，不得改成真实 SSH/SCP/systemctl/supervisorctl 执行。灾难性命令如 `rm -rf /`、裸盘写入、格式化、全局权限破坏、数据库 drop 应直接 blocked，而不是进入审批。
- day44 MCP 观测工具 server 是 JSON-RPC mock，不注册全局 MCP、不访问真实 Grafana/Prometheus/日志系统；接真实系统前必须补鉴权、权限过滤、审计和错误脱敏。
- day45 事故报告必须从结构化证据生成；报告内 token/password 等敏感字段必须脱敏，不能直接复制原始日志。

## 7. 已沉淀教程材料

- `docs/learning-map.md`：按目标选择最短路径、完整平台路径或多模态路径。
- `docs/checkpoints.md`：每 5 天实战检查点和验收题。
- `docs/windows-5060ti-local-runbook.md`：Win10 + RTX 5060 Ti 16G 真实运行前的只读检查和手动准备顺序。
- `docs/failure-labs.md`：错误驱动实验，训练从失败输出判断下一步动作。
- `docs/local-multimodal-e2e.md`：day31-day40 端到端 mock 链路和真实服务替换点。
- 未来如果继续补短板，优先沿生产工程 Agent 方向扩展：真实观测接入、权限中转、审批审计、故障诊断、事故复盘，而不是继续堆模型示例。

## 8. 提交规范

提交信息使用中文，优先：

```text
feat: 扩展 mini-openclaw 四十五天学习项目
fix: 修复 dayXX 自包含测试
chore: 整理 mini-openclaw 学习脚本
```
