# Day 55：事故复盘质量评估 Agent

## 概念

这一节检查事故复盘是否真的可用：时间线、影响面、根因、证据、修复、预防项和脱敏都要齐。文字像报告不够，缺证据或泄露 token/password 都不能通过。

## 代码结构

- `src/index.js`：mock 事故复盘、质量检查和下一步动作。
- `src/cli.js`：输出一份复盘质量评估 demo。
- `test/run.test.js`：验证完整报告、敏感字段泄露和缺失报告。

## 运行

```bash
# 用途：运行事故复盘质量评估 demo
# 执行目录：<项目根目录>/day55-incident-retro-quality-agent
# 结果判断：输出 status、score、checks、nextActions
# 风险：只读 mock，不访问事故系统、不发送报告
npm run demo
```

PowerShell：

```powershell
# 用途：在 Windows 上运行同一个复盘质量评估 demo
# 执行目录：<项目根目录>\day55-incident-retro-quality-agent
# 结果判断：localOnly 为 true
# 风险：只读 mock，不访问远程环境
npm run demo
```

## 实验

把 `rawText` 改成 `token=secret`，观察脱敏检查如何失败；删掉 `prevention`，观察状态如何从 ready 变成 incomplete。

## 复盘

好的复盘不是“写得多”，而是能支撑下一次排障：证据、修复和预防项必须具体，敏感字段必须脱敏。
