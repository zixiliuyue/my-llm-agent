# Day 74 - 结构化输出契约与自动修复

## 概念

让 LLM 输出**可被机器校验的结构(JSON)**,而不是自由文本,是 LLM 应用最基础的可靠性手段。这一日做三件事:

1. 一个不依赖第三方库的**轻量 JSON Schema 校验器**;
2. **function-calling 参数校验**——工具调用前先验入参,非法就拒绝执行;
3. **自动修复回路**——校验失败 → 把错误翻译成修复提示 → 让模型定向重试 → 再校验,最多 N 次。

关键边界:模型只负责“产出内容”;是否合法、错在哪、要不要重试由代码判断,绝不能让模型自己声称“我合法了”。

## 代码结构

- `src/index.js`:
  - `validateSchema`:支持 type/required/enum/minimum/maximum/minLength/properties/items 的递归校验器,错误带字段路径。
  - `validateToolCall`:用工具声明的 parameters schema 校验模型入参,输出 `callable`。
  - `buildRepairPrompt`:把校验错误翻译成给模型的修复提示。
  - `produceWithRepair`:初次产出 → 失败重试的自动修复回路,保留每轮尝试轨迹。
- `src/cli.js`:演示一个“先坏后好”的模型如何被回路修复,以及两次工具参数校验。
- `test/run.test.js`:覆盖类型/枚举/边界/必填/数组校验、工具校验、修复成功与重试用尽。

## 运行

```bash
# 用途：运行 day74 结构化输出契约 demo
# 执行目录：项目根目录
# 结果判断：repaired.ok=true 且用了 2 轮;badCall.callable=false,goodCall.callable=true
# 风险：producer 为 mock,不调用真实 LLM
npm run day74:start
```

## 实验

1. 把 `produceWithRepair` 的 `maxRetries` 设为 0,观察“先坏”的模型直接失败,体会重试预算的意义。
2. 给 schema 增加一个 `minLength` 更长的 `summary`,观察修复提示如何列出新错误。
3. 把 `windowMinutes` 的 `maximum` 改小,观察原本合法的工具调用变为不可执行。

## 复盘

- 结构化输出把“模型对不对”从主观判断变成可自动化的校验,是可靠性的地基。
- 校验失败不要直接报错给用户,而是翻译成修复提示让模型定向重试;重试要有预算上限。
- 工具调用前必须先验参数,非法入参绝不能真的执行——这是把 Agent 接入真实系统的安全底线。
