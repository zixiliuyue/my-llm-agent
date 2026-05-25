# Day 27：Gateway Auth

本目录是 mini-openclaw 30 天路线的第 27 天。它是完全自包含示例，不 import 其它 day 的源码。

## 概念

- 学习 Gateway token、loopback trust 和拒绝错误连接。
- 默认只信任本机和显式 token。

## 代码结构

- `src/index.js`：当天核心逻辑，包含完整中文注释。
- `src/cli.js`：当天命令行入口。
- `test/index.test.js`：不依赖真实模型的单元测试。

## 运行

```bash
# 用途：运行第 27 天主示例
# 执行目录：<项目根目录>/day27-gateway-auth
# 输出判断：stdout 输出 JSON demo 结果
# 风险：只跑本地 mock，不调用真实模型
npm start
```

```bash
# 用途：运行第 27 天测试
# 执行目录：<项目根目录>/day27-gateway-auth
# 输出判断：看到 day27 tests passed
# 风险：只跑本地测试
npm test
```

## 实验

运行后重点观察：loopback allowed、token allowed、bad token rejected。

## 复盘

这一天只引入一个 mini-openclaw 能力点。理解清楚后，再进入下一天。
