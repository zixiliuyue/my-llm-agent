# Day 14：事件流 UI

本目录是 mini-openclaw 30 天路线的第 14 天。它是完全自包含示例，不 import 其它 day 的源码。

## 概念

- 学习把 Gateway run events 展示成页面时间线。
- Web 页面只展示 mock 事件，不调用真实模型。

## 代码结构

- `src/index.js`：当天核心逻辑，包含完整中文注释。
- `src/cli.js`：当天命令行入口。
- `test/index.test.js`：不依赖真实模型的单元测试。
- `src/build.js`：生成静态 Web 演示页面到 `dist/`。

## 运行

```bash
# 用途：运行第 14 天主示例
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent/day14-event-stream-ui
# 输出判断：stdout 输出 JSON demo 结果
# 风险：只跑本地 mock，不调用真实模型
npm start
```

```bash
# 用途：运行第 14 天测试
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent/day14-event-stream-ui
# 输出判断：看到 day14 tests passed
# 风险：只跑本地测试
npm test
```

```bash
# 用途：构建第 14 天 Web 页面
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent/day14-event-stream-ui
# 输出判断：生成 dist/index.html
# 风险：只写入本 day 的 dist 产物，dist 不提交
npm run build
```

## 实验

运行后重点观察：event list、status badge、final answer。

## 复盘

这一天只引入一个 mini-openclaw 能力点。理解清楚后，再进入下一天。
