# Day 66 - Sandbox Executor

## 概念

这一日把 day61 的安全策略推进到执行器层：不受信任代码先过静态策略检查，再进入受限 JavaScript VM 或 Docker dry-run 容器规格。默认不启动真实容器，避免学习项目在本机执行未知代码。

## 代码结构

- `src/index.js`：代码检查、Docker sandbox spec、受限 VM、统一执行入口。
- `src/cli.js`：输出安全 JS、危险 JS、Python dry-run 三条路径。
- `test/run.test.js`：覆盖阻断、超时、容器规格和 demo。

## 运行

```bash
# 用途：运行 day66 沙盒执行器 demo
# 执行目录：项目根目录
# 结果判断：safeJavaScript.status=vm-executed，blockedJavaScript.status=blocked
# 风险：不启动真实 Docker，不执行 Python，只运行受限 JS VM
npm run day66:start
```

## 实验

1. 把 JS 代码改成 `process.env.SECRET`，观察静态策略阻断。
2. 把 JS 代码改成 `while (true) {}`，观察 VM timeout。
3. 查看 Python 返回的 Docker dry-run spec，理解真实容器需要哪些隔离参数。

## 复盘

- Node VM 只适合教学，不等价于生产沙盒。
- 真实执行不受信任代码时，应使用容器、只读 rootfs、无网络、资源限制、cap drop、审计日志。
- 安全策略必须在模型外侧执行，不能靠 prompt 约束。
