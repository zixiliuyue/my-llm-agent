# Day 49：测试环境发布验证 Agent

## 概念

这一节把发布后的判断标准结构化：版本、health、smoke、日志、前端资源 hash。Agent 不能只说“部署成功”，必须给出 pass、watch 或 rollback 的依据。

## 代码结构

- `src/index.js`：mock 发布快照、检查项收集和发布决策。
- `src/cli.js`：输出一份发布验证 demo。
- `test/run.test.js`：验证通过、观察和回滚三类结果。

## 运行

```bash
# 用途：运行测试环境发布验证 demo
# 执行目录：<项目根目录>/day49-release-verification-agent
# 结果判断：输出 checks、decision、nextActions
# 风险：只读 mock，不部署、不重启服务、不访问测试环境
npm run demo
```

PowerShell：

```powershell
# 用途：在 Windows 上运行同一个发布验证 demo
# 执行目录：<项目根目录>\day49-release-verification-agent
# 结果判断：decision 为 pass/watch/rollback
# 风险：只读 mock，不访问远程环境
npm run demo
```

## 实验

把 health 改成 `503`，观察为什么 decision 变成 rollback；把前端 hash 改错，观察为什么只是 watch。

## 复盘

发布验证 Agent 要把“能不能继续发布”说清楚：哪些证据硬失败、哪些只是观察项、回滚前要保留哪些日志。
