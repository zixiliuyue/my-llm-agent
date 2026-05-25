# 每 5 天实战检查点

这些检查点用于回答“我学完这一段，能不能独立复述和操作”。它们不是单元测试替代品，而是学习验收题。

## day01-day05：单体 Agent 到 Web API

你应该能做到：

- 用自己的话解释 agent loop：模型输出、协议解析、工具调用、最终回答。
- 说明工具调用为什么必须由代码执行，而不是相信模型自由执行。
- 解释 day05 的 Web API 如何把问题交给 agent，并返回 steps/answer。

验收题：

1. 如果模型第一次返回的不是 JSON，day01 应该怎么恢复？
2. 为什么 calculator 工具的输入必须被代码解析和执行？
3. `npm run day05:api -- --mock` 和真实 Ollama 调用的差异是什么？

推荐验证：

```bash
# 用途：验证 day01-day05 的基础测试
# 执行目录：<项目根目录>
# 结果判断：day01-day05 均打印 tests passed
# 风险：day05 测试会监听本地 127.0.0.1；不调用远程服务
npm run day01:test && npm run day02:test && npm run day03:test && npm run day04:test && npm run day05:test
```

## day06-day10：可观测、评估、会话和 Gateway

你应该能做到：

- 看懂 eval case、trace、耗时和调用统计。
- 区分 HTTP gateway、WebSocket gateway 和 JSONL session store 的职责。
- 说明为什么 session 需要可复盘，而不是只保存在内存里。

验收题：

1. eval case 失败时，你应该先看输入、期望、还是 trace？
2. WebSocket gateway 比 HTTP gateway 多解决了什么问题？
3. JSONL session store 的好处和限制是什么？

## day11-day15：平台入口和 UI 事件

你应该能做到：

- 解释 workspace bootstrap 的目标。
- 说明 provider router 为什么是确定性逻辑。
- 看懂 tool policy 如何保护危险工具。
- 读懂事件流 UI 和 WebChat session 的数据流。

验收题：

1. 如果 provider 配置成远程地址，应该在哪里拒绝？
2. tool policy 应该默认允许还是默认拒绝？为什么？
3. 事件流 UI 为什么适合展示 agent 执行过程？

## day16-day20：Skills、Plugin、MCP 和后台任务

你应该能做到：

- 说明 skill loader 和 plugin manifest 的差异。
- 解释 MCP adapter mock 的价值。
- 说明 background jobs 为什么需要状态和日志。

验收题：

1. skill 适合放工作流，plugin manifest 适合描述什么？
2. MCP mock 能防止什么学习阶段的问题？
3. 后台任务只返回 job id 时，UI 还需要哪些状态？

## day21-day25：通道、设备和执行边界

你应该能做到：

- 说明 webhook channel、mock chat channel、device pairing 的职责。
- 区分 sandbox dry-run 和真实执行。
- 解释 command queue steering 为什么不能让模型直接执行命令。

验收题：

1. webhook 失败时，应该重试还是丢弃？需要记录什么？
2. 设备配对为什么要有明确授权边界？
3. command queue 里哪些字段必须可审计？

## day26-day30：配置检查、鉴权、观测和集成

你应该能做到：

- 用 doctor/config checker 快速定位环境问题。
- 说明 gateway auth 放在哪一层。
- 看懂 observability dashboard 展示的关键指标。
- 解释 day30 集成后仍保持教学边界的原因。

验收题：

1. doctor 应该自动修复环境吗？为什么？
2. 鉴权失败应该返回什么信息，不应该泄露什么？
3. day30 集成后，为什么仍不把所有 day 抽成共享 core？

## day31-day35：本地多模态入口

你应该能做到：

- 解释 Mac mock 和 Windows GPU 实跑的分工。
- 说明 Ollama、ComfyUI、FramePack provider 为什么必须是 localhost。
- 说清 prompt optimizer、ComfyUI adapter、图片队列各自职责。

验收题：

1. day35 为什么只优化 prompt，不生成图片？
2. day33 的 `/prompt`、`/history`、`/view` 分别解决什么？
3. day34 队列为什么要有 queued/running/done/error/cancelled？

推荐验证：

```bash
# 用途：验证本地多模态入口 day31-day35
# 执行目录：<项目根目录>
# 结果判断：day31-day35 均打印 tests passed
# 风险：全部走 mock/纯函数，不访问真实模型服务
npm run day31:test && npm run day32:test && npm run day33:test && npm run day34:test && npm run day35:test
```

## day36-day40：资产、图片模型和视频评估

你应该能做到：

- 说明图片资产为什么要记录 prompt、seed、workflow、model。
- 判断 SDXL、FLUX.1 schnell、FLUX.1 dev 对 16G 显存的风险。
- 说明 SVD、FramePack、Wan 的学习优先级。

验收题：

1. 为什么 16G 显存不把 32B 或 Wan 14B 作为默认路径？
2. SDXL 和 FLUX.1 schnell 应该谁先作为学习默认？为什么？
3. 视频实验为什么先从本地图片转短视频开始？

推荐验证：

```bash
# 用途：验证资产和视频评估 day36-day40
# 执行目录：<项目根目录>
# 结果判断：day36-day40 均打印 tests passed
# 风险：全部走 mock/配置评估，不下载模型、不启动视频服务
npm run day36:test && npm run day37:test && npm run day38:test && npm run day39:test && npm run day40:test
```

## day41-day45：SRE、权限、审批、MCP 和事故报告

你应该能做到：

- 用证据驱动方式生成 SRE 排障假设，而不是让模型直接猜。
- 说明 admin 预热资源全集和当前用户过滤的边界。
- 判断远程命令应该 blocked、pending approval 还是 dry-run。
- 理解 MCP 观测工具 server 的 tools/list 和 tools/call。
- 把排障证据、审计和后续动作整理成事故报告。

验收题：

1. day41 的 hypotheses 哪些字段必须来自 evidence？
2. day42 为什么不允许 Agent 直接读 admin 预热的全部资源？
3. day43 为什么 `rm -rf /` 不能进入审批流程，而应该直接 blocked？
4. day44 的 mock MCP 工具如果接真实 Prometheus，需要补哪些权限和日志？
5. day45 的事故报告为什么要脱敏 token/password？

推荐验证：

```bash
# 用途：验证生产工程 Agent 案例 day41-day45
# 执行目录：<项目根目录>
# 结果判断：day41-day45 均打印 tests passed
# 风险：全部走 mock/dry-run，不访问真实生产系统
npm run day41:test && npm run day42:test && npm run day43:test && npm run day44:test && npm run day45:test
```

## day46-day50：观测、权限缓存、远程执行、发布验证和 CLI 接入

你应该能做到：

- 区分 Grafana/Prometheus 观测链路故障和业务服务故障。
- 说明 Redis 用户权限缓存、ACL snapshot 和真实用户身份如何一起影响访问结果。
- 判断远程命令是直接 blocked、pending approval 还是只读 dry-run。
- 用发布后检查项判断 pass、watch 或 rollback。
- 把 CLI 命令描述成 Agent 可调用 manifest，而不是让模型自由拼命令。

验收题：

1. day46 为什么 Grafana 403 不能直接判定业务服务挂了？
2. day47 为什么 `api_token` 不能作为最终用户身份？
3. day48 为什么服务重启必须进入审批，而读日志可以 dry-run？
4. day49 什么情况下应该 watch，而不是立刻 rollback？
5. day50 为什么不允许 Agent 传入任意 `baseUrl`？

推荐验证：

```bash
# 用途：验证工程现场 Agent 案例 day46-day50
# 执行目录：<项目根目录>
# 结果判断：day46-day50 均打印 tests passed
# 风险：全部走 mock/dry-run，不访问真实生产系统、不执行 CLI
npm run day46:test && npm run day47:test && npm run day48:test && npm run day49:test && npm run day50:test
```

## day51-day55：热更新、前端路由、SQL、MCP 验真和复盘质量

你应该能做到：

- 判断配置是否真的 reload，而不是靠进程重启后版本一致蒙混过关。
- 检查菜单、hidden route、`activeMenu`、权限树、i18n 和跳转入口是否一致。
- 只生成数据库修复 SQL、回滚 SQL 和风险说明，不直接执行。
- 区分服务 URL 可访问和真实 MCP 协议可用。
- 评估事故复盘是否包含时间线、影响面、根因、证据、修复、预防项和脱敏。

验收题：

1. day51 为什么进程启动时间是热更新诊断的关键证据？
2. day52 为什么 hidden route 要配置 `activeMenu`？
3. day53 为什么 SQL 草案要先 `SELECT ... FOR UPDATE`？
4. day54 为什么 `/health` 和 `/sse` 都不能直接当 MCP 入口？
5. day55 为什么缺少预防项的复盘不能算 ready？

推荐验证：

```bash
# 用途：验证工程质量 Agent 案例 day51-day55
# 执行目录：<项目根目录>
# 结果判断：day51-day55 均打印 tests passed
# 风险：全部走 mock/dry-run，不修改配置、不访问数据库、不注册 MCP
npm run day51:test && npm run day52:test && npm run day53:test && npm run day54:test && npm run day55:test
```

## day56：完整多 Agent 工程闭环 Capstone

你应该能做到：

- 解释 day02 多 agent 入门和 day56 工程闭环 capstone 的差异。
- 画出 coordinator、observability、permission、safety、sql、mcp-verifier、retro 的 handoff 顺序。
- 说明共享 evidence board 为什么比各 agent 各说各话更适合审计。
- 判断权限失败、高危命令、MCP 入口错误、复盘缺预防项时，闭环应该停在哪里。
- 说清为什么模型不能直接决定权限、执行命令或执行 SQL。

验收题：

1. coordinator 为什么必须在权限失败时阻断 safety/sql/mcp/retro 阶段？
2. safety-agent 为什么把 `rm -rf /` 直接 blocked，而不是 pending approval？
3. sql-agent 为什么必须输出 rollback SQL 且 `executableByAgent=false`？
4. mcp-verifier-agent 为什么必须验证 `/mcp`、initialize 和 `tools/list`？
5. retro-agent 为什么发现 `token=secret` 时不能让 final report ready？

推荐验证：

```bash
# 用途：验证最终完整多 Agent 工程闭环 capstone
# 执行目录：<项目根目录>
# 结果判断：day56 tests passed，happy path decision.status 为 ready-for-human-review
# 风险：全部走 mock/dry-run，不访问真实 Grafana/Redis/SSH/数据库/MCP/事故系统
npm run day56:test
```

## day57-day60：生产级 Runtime、Harness、RAG 和产品样板

你应该能做到：

- 解释 run、session、tool_call、evidence 为什么要持久化。
- 说明 worker lease、取消、重试、超时、恢复、幂等和并发控制的边界。
- 用 Harness 回放固定 run snapshot，并比较两个 prompt/model/tool 版本。
- 设计 RAG ingestion、hybrid search、rerank、citation、权限过滤、缓存和 recall eval。
- 用 day60 控制台讲清 run timeline、tool approval、RAG citation、evidence board 和 final report。

验收题：

1. day57 为什么 worker 拿任务要有 lease，而不是直接改 run 状态？
2. day58 的 replay 和 compare 分别解决什么问题？
3. day59 为什么权限过滤不能交给模型总结阶段？
4. day60 为什么 final report 只能 ready-for-human-review，不能自动执行修复？

推荐验证：

```bash
# 用途：验证生产级 Agent 平台补强 day57-day60
# 执行目录：<项目根目录>
# 结果判断：day57-day60 均打印 tests passed
# 风险：默认内存/mock；Docker Compose 和真实服务不在默认测试中启动
npm run day57:test && npm run day58:test && npm run day59:test && npm run day60:test
```

## day61-day65：安全、编排、灰度、路由和多模态

你应该能做到：

- 说明 prompt injection、tool output、secret/PII、网络、文件和 MCP/tool allowlist 的确定性策略边界。
- 用 DAG 解释 fan-out/fan-in、共享状态冲突、partial failure、预算、超时和取消。
- 解释 prompt/model/tool/spec 为什么都要版本化，shadow/canary/gray/rollback 如何串联。
- 用统一 provider 接口讲清 streaming、tool calling、JSON schema、retry、timeout、rate limit、cost 和 fallback。
- 把图片、语音、视频理解拆成 caption/OCR/object/quality/PII/EXIF/keyframe/eval。

验收题：

1. day61 发现工具输出含 token 时，为什么要先脱敏并记录风险？
2. day62 两个 agent 同时写同一个 shared state key 时，coordinator 应该怎么处理？
3. day63 哪些指标会触发 rollback-required？
4. day64 为什么 JSON schema 校验必须在模型外部做？
5. day65 为什么视频理解优先抽关键帧，而不是直接处理整段视频？

推荐验证：

```bash
# 用途：验证安全、编排、发布、模型路由和多模态 day61-day65
# 执行目录：<项目根目录>
# 结果判断：day61-day65 均打印 tests passed
# 风险：默认 mock/dry-run；不访问真实模型、网络或多媒体文件
npm run day61:test && npm run day62:test && npm run day63:test && npm run day64:test && npm run day65:test
```

## day66-day71：沙盒执行、HITL、真实依赖、OTel、CI 和协议

你应该能做到：

- 解释不受信任 JS/Python 代码如何先过策略检查，再进入 VM 或 Docker sandbox。
- 说明 HITL 为什么是暂停、通知、签名决策、继续/回滚的完整状态机。
- 设计 Postgres、Redis、MinIO 的真实依赖集成测试和配置 schema。
- 把结构化日志、Prometheus 指标和 Jaeger trace 接到 Agent run/tool call。
- 把 Agent eval 接入 GitHub Actions，并输出 PR 可读报告。
- 用 mini-acp envelope、JSON-RPC 和 pub/sub 解释多 Agent 通信边界。

验收题：

1. day66 为什么 Node VM 不能替代生产容器沙盒？
2. day67 webhook 决策为什么要签名校验和防重复？
3. day68 为什么默认测试不强依赖 Docker，但仍要保留 compose 入口？
4. day69 traceId 为什么必须贯穿 agent.run 和 tool.call？
5. day70 CI gate 应该看哪些指标，而不是只看单元测试？
6. day71 correlationId 对跨 agent 追踪有什么价值？

推荐验证：

```bash
# 用途：验证生产环境闭环补强 day66-day71
# 执行目录：<项目根目录>
# 结果判断：day66-day71 均打印 tests passed
# 风险：默认 mock/内存/dry-run，不启动 Docker、通知、消息队列或可观测后端
npm run day66:test && npm run day67:test && npm run day68:test && npm run day69:test && npm run day70:test && npm run day71:test
```
