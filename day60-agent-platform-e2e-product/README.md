# Day 60 - Agent Platform E2E Product

## 概念

这一日提供一个端到端产品样板：用户输入目标，平台创建 run，检索 RAG citation，工具调用进入人工审批，审批后写入 evidence board，最终生成 incident final report。

## 代码结构

- `src/index.js`：内存平台核心，包含 run、approval、citation、evidence、health、metrics。
- `src/build.js`：生成无依赖前端控制台。
- `openapi.yaml`：API 草案。
- `docker-compose.yml`：Postgres + Redis + api + worker 显式演示配置。

## 运行

```bash
# 用途：运行端到端产品 demo
# 执行目录：项目根目录
# 结果判断：stdout 输出 day=60，selectedRun.status=ready-for-human-review
# 风险：只用内存和 mock 数据，不访问真实远程服务
npm run day60:start
```

```bash
# 用途：构建前端控制台静态页面
# 执行目录：项目根目录
# 结果判断：生成 day60-agent-platform-e2e-product/dist/index.html
# 风险：只写入 dist 构建产物，不修改源码数据
npm run day60:build
```

```bash
# 用途：检查 Docker Compose 是否可用于真实服务演示
# 执行目录：项目根目录
# 结果判断：ok=true 表示可进入当天目录执行 docker compose up --build
# 风险：本命令不启动容器；真正启动容器前需要确认端口占用和资源
npm run day60:compose
```

## 压测 / 回归命令

```bash
# 用途：对核心闭环做本地回归
# 执行目录：项目根目录
# 结果判断：day60 tests passed
# 风险：只跑本地单测
npm run day60:test
```

真实压测可以在 API 服务实现后使用 `autocannon -c 20 -d 30 http://127.0.0.1:3000/runs`，本教学版先保留命令形态，不在默认测试里引入依赖。

## 复盘

- 产品 demo 必须展示用户看得到的闭环，而不是只展示底层函数。
- approval 是确定性状态机，模型不能绕过人工决策直接执行工具。
- RAG citation 和 evidence board 是最终报告可审计的来源。
