# Day 24：Sandbox Policy Dry-run

本目录是 mini-openclaw 30 天路线的第 24 天。它是完全自包含示例，不 import 其它 day 的源码。

## 概念

- 学习命令执行前的沙箱策略判断。
- 危险命令只输出 blocked，不执行。

## 代码结构

- `src/index.js`：当天核心逻辑，包含完整中文注释。
- `src/cli.js`：当天命令行入口。
- `test/index.test.js`：不依赖真实模型的单元测试。

## 运行

```bash
# 用途：运行第 24 天主示例
# 执行目录：<项目根目录>/day24-sandbox-policy-dry-run
# 输出判断：stdout 输出 JSON demo 结果
# 风险：只跑本地 mock，不调用真实模型
npm start
```

```bash
# 用途：运行第 24 天测试
# 执行目录：<项目根目录>/day24-sandbox-policy-dry-run
# 输出判断：看到 day24 tests passed
# 风险：只跑本地测试
npm test
```

## 实验

运行后重点观察：classify command、block dangerous、allow read-only。

## 复盘

这一天只引入一个 mini-openclaw 能力点。理解清楚后，再进入下一天。
