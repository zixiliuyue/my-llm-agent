# Day 51：配置热更新诊断 Agent

## 概念

这一节训练 Agent 判断配置是否真的热更新。版本一致不一定代表 reload 成功，可能只是服务被重启了；必须同时看配置文件修改时间、进程启动时间、reload 日志和运行时版本。

## 代码结构

- `src/index.js`：mock 配置快照、证据收集和热更新诊断。
- `src/cli.js`：输出一份配置热更新诊断 demo。
- `test/run.test.js`：验证真实热更新、重启掩盖、reload 缺失和失败回滚。

## 运行

```bash
# 用途：运行配置热更新诊断 demo
# 执行目录：<项目根目录>/day51-config-hot-reload-diagnosis-agent
# 结果判断：输出 status、evidence、nextActions
# 风险：只读 mock，不修改配置、不重启服务
npm run demo
```

PowerShell：

```powershell
# 用途：在 Windows 上运行同一个热更新诊断 demo
# 执行目录：<项目根目录>\day51-config-hot-reload-diagnosis-agent
# 结果判断：localOnly 为 true
# 风险：只读 mock，不访问远程环境
npm run demo
```

## 实验

把 `processStartedAt` 改到 `configMtime` 之后，观察为什么状态变成 `restart-masked-reload`。

## 复盘

“不重启生效”必须靠证据证明：reload log、runtime config version、进程启动时间缺一不可。
