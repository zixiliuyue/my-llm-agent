# Day 45：Agent 事故报告

## 概念

排障结束后，Agent 应该把证据、判断、时间线、审计和后续动作整理成事故报告。报告不是模型自由发挥，而是从结构化证据生成，并且要脱敏。

## 代码结构

- `src/index.js`：mock 事故上下文、后续动作生成、Markdown 报告和脱敏。
- `src/cli.js`：输出事故报告 JSON。
- `test/run.test.js`：覆盖证据、时间线、审计、action items 和敏感信息脱敏。

## 运行

```bash
# 用途：生成一份 mock 事故报告
# 执行目录：<项目根目录>/day45-agent-incident-report
# 结果判断：输出 markdown，包含证据、判断、时间线、审计、后续动作
# 风险：只读 mock，不访问真实事故系统
npm run demo
```

PowerShell：

```powershell
# 用途：在 Windows 上生成同样的事故报告
# 执行目录：<项目根目录>\day45-agent-incident-report
# 结果判断：markdown 字段包含 ## 后续动作
# 风险：只读 mock
npm run demo
```

## 实验

往 evidence 里加入 `token=abc` 或 `password=abc`，确认报告会脱敏。

## 复盘

对平台工程和 SRE 场景来说，Agent 最终交付物往往不是一句回答，而是一份能复盘、能追责、能跟进行动项的报告。
