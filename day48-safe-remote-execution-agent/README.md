# Day 48：安全远程执行审批 Agent

## 概念

这一节把远程命令请求拆成风险判断、审批摘要、dry-run 和回滚建议。灾难性命令必须直接 blocked，不能进入审批队列；服务重启、数据库命令必须 pending approval。

## 代码结构

- `src/index.js`：命令风险分类、远程执行计划和审计记录。
- `src/cli.js`：输出安全读日志、待审批重启和直接阻断的 demo。
- `test/run.test.js`：验证 blocked、dry-run-ready、pending-approval 三类路径。

## 运行

```bash
# 用途：运行安全远程执行审批 demo
# 执行目录：<项目根目录>/day48-safe-remote-execution-agent
# 结果判断：输出 safeRead、approval、blocked 三个计划
# 风险：教学 dry-run，不执行 SSH/SCP/systemctl/supervisorctl
npm run demo
```

PowerShell：

```powershell
# 用途：在 Windows 上运行同一个审批 demo
# 执行目录：<项目根目录>\day48-safe-remote-execution-agent
# 结果判断：blocked 命令不会进入审批
# 风险：教学 dry-run，不访问远程机器
npm run demo
```

## 实验

把命令改成 `mysql -e "delete from users"`，观察它为什么需要审批；再改成 `rm -rf /`，确认它直接 blocked。

## 复盘

远程执行 Agent 的价值不是“替你敲 SSH”，而是把风险、审批、审计、回滚和验证固定下来。
