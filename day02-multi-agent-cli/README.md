# Day 02：多 Agent CLI 协作

第二天把 day01 的单体 agent loop 拆成 planner、tool-runner、critic(评论家)、writer 四个角色。重点是理解 agent 之间如何交接，而不是简单多调用几次模型。

## 概念

- planner：只拆任务，不执行工具。
- tool-runner：只执行工具并产出 observation(观察)。
- critic：只检查 observation 是否足够回答问题。
- writer：只基于已有上下文写 final。

## 运行

```bash
# 用途：运行多 agent CLI
# 执行目录：<项目根目录>
# 参数含义：-- 后面是用户问题
# 输出判断：stderr 展示各 agent 交接，stdout 输出最终答案
# 风险：会调用 OLLAMA_HOST 指向的模型
npm run day02:ask -- "计算 (18+24)*3"
```

```bash
# 用途：在 day02 子目录内直接运行同一个示例
# 执行目录：day02-multi-agent-cli
# 参数含义：-- 后面是用户问题
# 输出判断：stderr 展示各 agent 交接，stdout 输出最终答案
# 风险：会调用 OLLAMA_HOST 指向的模型
npm run ask -- "计算 (18+24)*3"
```

```bash
# 用途：运行不依赖真实模型的 handoff 测试
# 执行目录：<项目根目录>
# 输出判断：看到 day02 tests passed
# 风险：只用 mock client，不调用 Ollama
npm run day02:test
```

## 代码入口

- `src/handoff-protocol.js`：解析 planner、critic、writer 的 JSON 输出。
- `src/multi-agent.js`：编排四个角色。
- `src/roles.js`：每个 agent 的职责 prompt。
- `test/multi-agent.test.js`：mock 多 agent 流程。

## 复盘

多 agent 的关键是边界：planner 不能编造结果，critic 不能重写答案，writer 不能引入 observation 之外的新事实。
