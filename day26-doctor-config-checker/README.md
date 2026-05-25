# Day 26：Doctor Config Checker

本目录是 mini-openclaw 30 天路线的第 26 天。它是完全自包含示例，不 import 其它 day 的源码。

## 概念

- 学习 doctor 命令如何检查端口、workspace、模型配置。
- 所有检查都是本地只读。

## 代码结构

- `src/index.js`：当天核心逻辑，包含完整中文注释。
- `src/cli.js`：当天命令行入口。
- `test/index.test.js`：不依赖真实模型的单元测试。

## 运行

```bash
# 用途：运行第 26 天主示例
# 执行目录：<项目根目录>/day26-doctor-config-checker
# 输出判断：stdout 输出 JSON demo 结果
# 风险：只跑本地 mock，不调用真实模型
npm start
```

```bash
# 用途：运行第 26 天测试
# 执行目录：<项目根目录>/day26-doctor-config-checker
# 输出判断：看到 day26 tests passed
# 风险：只跑本地测试
npm test
```

## 实验

运行后重点观察：check config、check port、check workspace。

## 复盘

这一天只引入一个 mini-openclaw 能力点。理解清楚后，再进入下一天。
