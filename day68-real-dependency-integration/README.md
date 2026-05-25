# Day 68 - Real Dependency Integration

## 概念

这一日补齐真实依赖集成测试和生产级配置管理：用 Docker Compose / Testcontainers 思路启动 Postgres、Redis、MinIO，并用 dotenv + schema 校验管理环境变量。

## 代码结构

- `src/index.js`：dotenv parser、配置 schema、compose 计划、集成测试计划。
- `src/compose-check.js`：只读检查 Docker Compose 是否可用。
- `docker-compose.yml`：Postgres、Redis、MinIO 演示依赖。
- `test/run.test.js`：默认不启动 Docker，只验证计划和配置。

## 运行

```bash
# 用途：运行 day68 配置和依赖计划 demo
# 执行目录：项目根目录
# 结果判断：输出 compose.services 和 integrationTestPlan.assertions
# 风险：不启动 Docker，不连接真实依赖
npm run day68:start
```

```bash
# 用途：检查当前机器是否具备 Docker Compose
# 执行目录：项目根目录
# 结果判断：ok=true 表示可进入 day68 目录执行 docker compose up
# 风险：只读检查，不启动容器
npm run day68:compose
```

## 实验

1. 把 `DEPENDENCY_MODE` 改成 `external`，观察配置仍可通过。
2. 把 `POSTGRES_URL` 改成 `http://bad`，观察 schema 校验失败。
3. 在 Docker 可用机器上执行 `cd day68-real-dependency-integration && docker compose up`。

## 复盘

- 默认 CI 不应强依赖 Docker，但要保留真实依赖演示入口。
- 配置必须有 schema 和环境枚举，不能让 Agent 随意拼连接地址。
- 集成测试要验证真实行为：DB 写入、Redis lease、对象存储上传。
