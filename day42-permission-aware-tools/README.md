# Day 42：权限感知工具调用

## 概念

Agent 不能因为能看到工具就绕过业务权限。Day42 模拟“admin 预热资源全集 + 当前用户查询时过滤”的模式：后台可以构建完整索引，但工具调用必须按真实用户权限执行。

## 代码结构

- `src/index.js`：权限快照、资源过滤、工具调用前置授权和审计记录。
- `src/cli.js`：输出 alice 与 sre 两种用户视角。
- `test/run.test.js`：验证未授权用户无法访问私有 dashboard。

## 运行

```bash
# 用途：运行权限感知工具 demo
# 执行目录：<项目根目录>/day42-permission-aware-tools
# 结果判断：alice 被拒绝访问 dash-pay，sre 可以访问
# 风险：只读 mock，不访问真实 Grafana/CMDB
npm run demo
```

PowerShell：

```powershell
# 用途：在 Windows 上运行同一个权限过滤 demo
# 执行目录：<项目根目录>\day42-permission-aware-tools
# 结果判断：deniedExample.code 为 forbidden
# 风险：只读 mock
npm run demo
```

## 实验

给 alice 增加 `sre` role，再观察 `dash-pay` 是否可见。注意这是 mock 权限，不是生产授权。

## 复盘

你历史上的 Grafana 权限缓存场景本质就是这个模式：后台构建 superset，查询时再按当前用户过滤。
