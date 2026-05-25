# Day 52：前端权限路由检查 Agent

## 概念

这一节检查菜单、hidden route、`activeMenu`、i18n 和跳转权限是否一致。前端权限问题常见表现是页面存在但菜单不亮、卡片跳转后无权限、隐藏路由缺少父菜单回指。

## 代码结构

- `src/index.js`：mock 路由、菜单、权限树、i18n key 和跳转入口，并输出检查结果。
- `src/cli.js`：输出一份前端权限路由检查 demo。
- `test/run.test.js`：验证 hidden route、i18n 和跳转权限问题能被发现。

## 运行

```bash
# 用途：运行前端权限路由检查 demo
# 执行目录：<项目根目录>/day52-frontend-permission-route-checker
# 结果判断：status 为 ok 或 needs-fix，issues 列出具体问题
# 风险：只读 mock，不改前端代码、不访问页面
npm run demo
```

PowerShell：

```powershell
# 用途：在 Windows 上运行同一个前端路由检查 demo
# 执行目录：<项目根目录>\day52-frontend-permission-route-checker
# 结果判断：localOnly 为 true
# 风险：只读 mock，不访问远程环境
npm run demo
```

## 实验

删掉隐藏路由的 `activeMenu`，再删掉一个 i18n key，观察 `issues` 如何变化。

## 复盘

前端权限路由不是单点问题。菜单、权限树、隐藏路由、跳转入口和 i18n 必须一起检查。
