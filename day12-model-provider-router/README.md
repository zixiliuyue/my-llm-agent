# Day 12：Model Provider Router

本目录是 mini-openclaw 30 天路线的第 12 天。它是完全自包含示例，不 import 其它 day 的源码。

## 概念

- 学习 mock、Ollama、fallback provider 的选择。
- 把模型调用从业务逻辑中拆出来。

## 代码结构

- `src/index.js`：当天核心逻辑，包含完整中文注释。
- `src/cli.js`：当天命令行入口。
- `test/index.test.js`：不依赖真实模型的单元测试。

## 运行

```bash
# 用途：运行第 12 天主示例
# 执行目录：<项目根目录>/day12-model-provider-router
# 输出判断：stdout 输出 JSON demo 结果
# 风险：只跑本地 mock，不调用真实模型
npm start
```

```bash
# 用途：运行第 12 天测试
# 执行目录：<项目根目录>/day12-model-provider-router
# 输出判断：看到 day12 tests passed
# 风险：只跑本地测试
npm test
```

## 实验

运行后重点观察：mock provider、ollama provider、fallback provider。

## 复盘

这一天只引入一个 mini-openclaw 能力点。理解清楚后，再进入下一天。
