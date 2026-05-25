# Day 43：远程命令审批链

## 概念

远程执行是高风险能力。Day43 把命令执行拆成：风险识别、审批请求、dry-run 输出和审计记录。教学项目不执行真实 SSH、SCP、systemctl 或 supervisorctl。

## 代码结构

- `src/index.js`：命令风险分类、审批请求、dry-run 和审计。
- `src/cli.js`：输出服务日志查询和高危命令阻断示例。
- `test/run.test.js`：覆盖高危命令、服务操作审批和 dry-run。

## 运行

```bash
# 用途：运行远程命令审批 demo
# 执行目录：<项目根目录>/day43-remote-command-approval
# 结果判断：blockedExample.status 为 blocked，dryRun.executed 为 false
# 风险：只输出 dry-run，不执行远程命令
npm run demo
```

PowerShell：

```powershell
# 用途：在 Windows 上运行同一个审批链 demo
# 执行目录：<项目根目录>\day43-remote-command-approval
# 结果判断：dryRun.stdout 以 [dry-run] 开头
# 风险：只读 mock，不执行命令
npm run demo
```

## 实验

把命令改成 `supervisorctl restart gpmm_backend`、`cat /tmp/app.log`、`rm -rf /`，观察风险等级变化。

## 复盘

Agent 可以生成命令计划，但真实执行必须走审批、审计和回滚边界。你的 CLI/测试环境工作尤其需要这个能力。
