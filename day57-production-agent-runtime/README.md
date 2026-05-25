# Day 57：Production Agent Runtime

## 概念

这一节把岗位截图里的 Agent Runtime 落成可测试结构：API 创建 run，worker 通过 lease 领取任务，storage 持久化 session/run/tool_call/evidence，运行时支持取消、重试、超时、恢复、幂等和并发控制。

## 代码结构

- `src/index.js`：内存版生产 Runtime，表达 API、worker、storage 和 Redis-like lease 的核心语义。
- `src/compose-check.js`：Docker Compose 演示入口检查，不强制启动真实服务。
- `docker-compose.yml`：Postgres + Redis + api + worker 的展示拓扑。
- `test/run.test.js`：覆盖幂等、租约、并发、取消、超时、重试和恢复。

## 运行

```bash
# 用途：运行生产 Runtime demo
# 执行目录：<项目根目录>/day57-production-agent-runtime
# 结果判断：输出 session、run、toolCalls、evidence、dockerCompose
# 风险：只用内存 adapter，不连接真实 Postgres/Redis
npm run demo
```

```bash
# 用途：查看 Docker Compose 演示命令
# 执行目录：<项目根目录>/day57-production-agent-runtime
# 结果判断：Docker 可用时输出版本；不可用时输出提示但不影响测试
# 风险：默认不启动容器
npm run compose
```

## 实验

把 `maxConcurrentRuns` 改成 2，观察 `leaseRun` 如何允许两个 worker 并发；把 `leaseMs` 调小，观察 `recoverExpiredLeases` 如何把卡住的 running run 放回队列。

## 复盘

生产级 Runtime 的重点不是模型回答，而是运行可靠性：状态要可恢复，工具调用要可审计，失败要能重试，重复请求要幂等。
