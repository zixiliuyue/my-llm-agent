# Day 47：权限缓存排障 Agent

## 概念

这一节模拟真实权限排障：后台可以用 admin 预热资源全集，但当前用户查询时必须按 Redis 用户权限和 ACL snapshot 再过滤。Agent 不能因为看到全集就绕过业务权限。

## 代码结构

- `src/index.js`：mock 权限 case、真实用户解析、资源过滤和根因判断。
- `src/cli.js`：输出一份权限缓存排障 demo。
- `test/run.test.js`：验证权限缓存缺失、用户过滤和 api_token 兼容。

## 运行

```bash
# 用途：运行权限缓存排障 demo
# 执行目录：<项目根目录>/day47-permission-cache-debugger
# 结果判断：输出 rootCause、evidence、visibleResources、nextActions
# 风险：只读 mock，不访问 Redis/Grafana/业务接口
npm run demo
```

PowerShell：

```powershell
# 用途：在 Windows 上运行同一个权限排障 demo
# 执行目录：<项目根目录>\day47-permission-cache-debugger
# 结果判断：localOnly 为 true
# 风险：只读 mock，不访问远程环境
npm run demo
```

## 实验

给 `redisUserPermission` 增加 `projects: ["FREEFIRE"]`，再把 header 里的 `currentuser` 改成 `api_token`，观察真实用户 fallback 是否还能工作。

## 复盘

权限类 Agent 的核心不是“查得到更多”，而是明确谁可以查什么、哪里缓存、哪里过滤、哪里必须审计。
