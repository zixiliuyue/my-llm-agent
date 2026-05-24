# Day 22：Mock Chat Channel

本目录是 mini-openclaw 30 天路线的第 22 天。它是完全自包含示例，不 import 其它 day 的源码。

## 概念

- 学习 Telegram/Slack 风格聊天通道抽象。
- 用 mock adapter 表示入站和出站消息。

## 代码结构

- `src/index.js`：当天核心逻辑，包含完整中文注释。
- `src/cli.js`：当天命令行入口。
- `test/index.test.js`：不依赖真实模型的单元测试。

## 运行

```bash
# 用途：运行第 22 天主示例
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent/day22-mock-chat-channel
# 输出判断：stdout 输出 JSON demo 结果
# 风险：只跑本地 mock，不调用真实模型
npm start
```

```bash
# 用途：运行第 22 天测试
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent/day22-mock-chat-channel
# 输出判断：看到 day22 tests passed
# 风险：只跑本地测试
npm test
```

## 实验

运行后重点观察：incoming message、route to agent、outgoing reply。

## 复盘

这一天只引入一个 mini-openclaw 能力点。理解清楚后，再进入下一天。
