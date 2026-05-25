# Day 53：数据库修复 SQL 生成 Agent

## 概念

这一节只生成 SQL、回滚 SQL 和风险说明，不直接执行数据库变更。Agent 必须把目标行、旧值、新值、事务边界和回滚路径写清楚。

## 代码结构

- `src/index.js`：mock SQL 修复请求、安全校验、SQL 和回滚 SQL 生成。
- `src/cli.js`：输出一份数据库修复 SQL demo。
- `test/run.test.js`：验证 `SELECT ... FOR UPDATE`、回滚 SQL、字符串转义和拒绝不安全输入。

## 运行

```bash
# 用途：生成数据库修复 SQL 草案
# 执行目录：<项目根目录>/day53-database-fix-sql-agent
# 结果判断：输出 sql、rollbackSql、risk，executableByAgent 为 false
# 风险：只生成文本，不连接数据库、不执行 SQL
npm run demo
```

PowerShell：

```powershell
# 用途：在 Windows 上生成同一个 SQL 草案
# 执行目录：<项目根目录>\day53-database-fix-sql-agent
# 结果判断：localOnly 为 true
# 风险：只生成文本，不访问数据库
npm run demo
```

## 实验

把 `ids` 改成空数组，观察为什么直接拒绝；把 `newValue` 改成包含单引号的字符串，观察转义结果。

## 复盘

数据库修复 Agent 的边界很硬：它可以帮你写 SQL，但不能替你执行，也不能绕过人工确认和回滚方案。
