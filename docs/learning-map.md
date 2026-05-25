# mini-openclaw 学习地图

这份地图不是命令清单，而是帮你判断“我现在该学哪几天、学完能做什么”。仓库仍然保持每个 day 自包含；学习路线可以按目标裁剪。

## 能力分区

| 范围 | 分类 | 学完后的能力 |
|---|---|---|
| day01-day04 | Agent 核心 | 能解释 agent loop、协议解析、工具调用、多 agent 协作和 MCP mock 边界。 |
| day05-day10 | API / Web / 状态 | 能把 agent 接到 Web API，理解 trace、eval、session、HTTP/WebSocket gateway。 |
| day11-day18 | 平台骨架 | 能理解 workspace bootstrap、provider router、tool policy、skills、plugin manifest、MCP adapter。 |
| day19-day27 | 工程化控制面 | 能处理 file memory、background jobs、channel adapter、device pairing、sandbox dry-run、queue steering、auth。 |
| day28-day30 | mini-openclaw 集成 | 能把观测、onboarding 和集成页面串成教学版平台。 |
| day31-day35 | 本地多模态入口 | 能区分 Ollama、ComfyUI、图片队列、prompt optimizer 的职责和本地安全边界。 |
| day36-day40 | 本地资产和视频评估 | 能判断 SDXL/FLUX/SVD/FramePack/Wan 是否适合当前 Mac 或 Windows 5060 Ti。 |
| day41-day45 | 生产工程 Agent | 能把 SRE 排障、权限过滤、远程审批、MCP 观测工具和事故报告串成可审计流程。 |
| day46-day50 | 工程现场 Agent | 能把观测诊断、权限缓存排障、安全远程执行、发布验证和 CLI manifest 接到真实工作方法。 |
| day51-day55 | 工程质量 Agent | 能判断配置热更新、前端权限路由、SQL 修复、MCP 接入和复盘质量是否达标。 |
| day56 | 完整多 Agent Capstone | 能把工程 Agent 串成可审计闭环，输出 handoff、evidence board 和人工审阅结论。 |
| day57-day60 | 生产级 Agent 平台 | 能解释 Runtime、Harness、RAG 和端到端产品样板如何支撑可运行、可测量、可上线。 |
| day61-day65 | 安全、编排、发布、路由、多模态 | 能解释安全沙盒、DAG 编排、灰度发布、多模型路由和多模态理解如何进入生产边界。 |

## 最短路径：先跑本地大模型

1. day01：理解最小 agent loop 和 `npm run day01:ask`。
2. day05：理解 Web API 怎么接 agent。
3. day12：理解模型 provider router，不把路由交给模型自由决定。
4. day26：理解 doctor/config checker。
5. day31：用只读方式检查 Mac 和 Windows 本地环境。
6. day41：把真实排障思路固化为证据驱动的诊断流程。
7. day46：先判断观测链路是否可信，再判断服务是否故障。
8. day50：把常用 CLI 能力收敛成 Agent 可调用 manifest。
9. day51：判断配置是否真的热更新，不用重启结果冒充。
10. day54：验证 MCP 入口和工具面是否真实可用。
11. day56：把观测、权限、审批、SQL、MCP 和复盘质量串成完整闭环。
12. day57：理解 run/session/tool_call/evidence 持久化和 worker lease。
13. day64：把 OpenAI/Claude/Qwen/Ollama 等 provider 纳入统一路由、降级和成本统计。

推荐命令：

```bash
# 用途：确认本地 Node/npm/Ollama/ComfyUI/FramePack/Python/GPU 检查能正常输出
# 执行目录：<项目根目录>
# 结果判断：Node/npm 为 OK；未启动的本地服务只显示 WARN/INFO，不抛堆栈
# 风险：只读检查，不安装软件、不拉模型、不修改驱动
npm run doctor
```

## 完整路径：做教学版 mini-openclaw

按 day01-day30 顺序学习。重点不是代码量，而是每一层只解决一个问题：

- day01-day04：先把 agent 的“思考、调用工具、恢复协议错误”搞清楚。
- day05-day10：再把 agent 变成可被 Web/API 调用的服务。
- day11-day18：补平台需要的 provider、policy、skills、plugin、MCP 结构。
- day19-day27：补长期运行需要的 memory、jobs、channel、sandbox、auth。
- day28-day30：最后做观测、onboarding 和集成。
- day41-day56：按你的真实工作场景补上 SRE/权限/远程审批/MCP/事故报告/观测诊断/发布验证/CLI 接入/热更新/前端路由/SQL/复盘质量和完整多 Agent capstone。
- day57-day65：补齐岗位截图里的生产级短板，重点看 Runtime、Harness、RAG、产品样板、安全沙盒、DAG 编排、灰度发布、多模型路由和多模态理解。

## 多模态路径：Mac mock，Windows 实跑

如果你最终要在 Win10 + RTX 5060 Ti 16G + 32G 内存上跑图片/视频，建议先按这个顺序：

1. day31：只读检查环境，不急着安装。
2. day32：确认 provider 只允许本机地址。
3. day35：让 Ollama 只优化 prompt，不生成图片。
4. day33：理解 ComfyUI `/prompt`、`/history`、`/view` 协议。
5. day34：用队列承接慢任务。
6. day36：记录图片资产元数据。
7. day37：先 SDXL，再 FLUX.1 schnell，不把 32B 或重模型当默认。
8. day38-day40：先 SVD/FramePack，再把 Wan 作为评估候选。

端到端 mock 命令：

```bash
# 用途：把 day35、day33、day34、day36、day38、day39、day40 串成一个本地多模态流程
# 执行目录：<项目根目录>
# 结果判断：输出 JSON，包含 optimizedPrompt、comfyRequest、queue、asset、videoPlan
# 风险：mock 流程，不访问 Ollama/ComfyUI/FramePack，不生成图片或视频
npm run local:multimodal -- "一个本地 agent 平台封面图"
```

## 学习时的判断标准

- 能讲清“这一天解决什么问题”，比记住文件名更重要。
- 能指出“不做什么”，比只跑成功更重要。例如 day35 不生成图片，day33 不安装 ComfyUI。
- 能把失败输出翻译成下一步动作，才算能迁移到另一台机器。
- 能在 Mac 上跑 mock，在 Windows 上替换成本机真实服务，才算跨平台学习成功。
- 能把 Agent 输出落到证据、权限、审批、审计和复盘，才算能进入生产工程场景。
- 能把 Agent 调用真实工具前的 manifest、环境枚举、输出契约和风险审批写清楚，才算适合接入工作 CLI。
- 能把配置热更新、前端权限路由、SQL 草案、MCP 入口和复盘质量都拆成可验证证据，才算具备工程迁移能力。
- 能把多个 Agent 的 handoff 顺序、共享证据板和最终审计报告讲清楚，才算真正完成 day56 capstone。
- 能把 Runtime、Harness、RAG、Sandbox、Release 和 Router 的边界讲清楚，才算能回答 Agent 岗位的生产级系统设计追问。
- 能用 day60 前端控制台展示 run timeline、tool approval、citation、evidence 和 final report，才算有可演示的端到端产品原型。
