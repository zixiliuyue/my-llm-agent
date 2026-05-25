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
