# Day 71 - Agent Communication Protocol

## 概念

这一日定义多 Agent 通信协议：统一 envelope、JSON-RPC request/response、pub/sub 事件和内存 broker。真实系统可把 broker 替换成 NATS、Redis Stream、Kafka、gRPC 或 HTTP。

## 代码结构

- `src/index.js`：mini-acp envelope、JSON-RPC、内存 broker、审计日志。
- `src/cli.js`：演示 planner -> worker 请求，以及 worker -> reviewer 事件。
- `test/run.test.js`：覆盖协议校验、点对点通信和发布订阅。

## 运行

```bash
# 用途：运行 day71 Agent 通信协议 demo
# 执行目录：项目根目录
# 结果判断：response.payload.result.status=ok，delivered[0].reviewed=true
# 风险：只使用内存 broker，不启动消息中间件
npm run day71:start
```

## 实验

1. 去掉 request envelope 的 `to` 字段，观察协议校验失败。
2. 增加一个 subscriber，观察同一个 event fan-out。
3. 把 JSON-RPC method 改成 `tool.run`，观察 audit 中保留 correlationId。

## 复盘

- 多 Agent 协作要有稳定消息格式，不能靠自由文本互相猜。
- request-response 和 pub/sub 是两种不同通信模式，应分别审计。
- correlationId 是跨 agent 追踪和复盘的关键字段。
