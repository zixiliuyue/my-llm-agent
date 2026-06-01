/**
 * Day 68：真实依赖集成测试与配置管理。
 *
 * 学习目标：展示 Agent 服务如何用 Docker Compose 或 Testcontainers 思路启动 Redis、
 * Postgres、MinIO 等真实依赖，并用 dotenv + schema 校验管理生产级配置。
 */

/** 解析 .env 文本；真实项目可替换 dotenv 包，这里保持自包含。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function parseDotenv(text = "") {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const values = {};
  // 循环：按顺序处理多条数据或多个步骤。
  for (const line of text.split(/\r?\n/)) {
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const trimmed = line.trim();
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!trimmed || trimmed.startsWith("#")) continue;
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const index = trimmed.indexOf("=");
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (index === -1) continue;
    values[trimmed.slice(0, index)] = trimmed.slice(index + 1).replace(/^["']|["']$/g, "");
  }
  // 返回结果：调用方会拿到这个值继续后续流程。
  return values;
}

/** 加载并校验配置；类似 convict 的 schema + env override 思路。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function loadConfig({ env = {}, dotenvText = "" } = {}) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const dotenv = parseDotenv(dotenvText);
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const merged = { ...dotenv, ...env };
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const config = {
    nodeEnv: merged.NODE_ENV || "test",
    postgresUrl: merged.POSTGRES_URL || "postgres://agent:agent@127.0.0.1:55432/agent_ops",
    redisUrl: merged.REDIS_URL || "redis://127.0.0.1:56379/0",
    minioEndpoint: merged.MINIO_ENDPOINT || "http://127.0.0.1:59000",
    minioBucket: merged.MINIO_BUCKET || "agent-artifacts",
    dependencyMode: merged.DEPENDENCY_MODE || "compose",
  };
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const errors = validateConfig(config);
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (errors.length > 0) throw new Error(`配置错误: ${errors.join("; ")}`);
  // 返回结果：调用方会拿到这个值继续后续流程。
  return config;
}

/** 校验连接字符串、环境枚举和 bucket。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function validateConfig(config) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const errors = [];
  // try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
  try {
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const postgres = new URL(config.postgresUrl);
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!["postgres:", "postgresql:"].includes(postgres.protocol)) errors.push("POSTGRES_URL must be postgres");
  // catch 块：把异常转换成可理解的错误结果或退出码。
  } catch {
    errors.push("POSTGRES_URL invalid");
  }
  // try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
  try {
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const redis = new URL(config.redisUrl);
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (redis.protocol !== "redis:") errors.push("REDIS_URL must be redis");
  // catch 块：把异常转换成可理解的错误结果或退出码。
  } catch {
    errors.push("REDIS_URL invalid");
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!["compose", "testcontainers", "external"].includes(config.dependencyMode)) errors.push("DEPENDENCY_MODE invalid");
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(config.minioBucket)) errors.push("MINIO_BUCKET invalid");
  // 返回结果：调用方会拿到这个值继续后续流程。
  return errors;
}

/** 生成 Docker Compose 服务计划。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function createComposePlan(config) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    services: ["postgres:16-alpine", "redis:7-alpine", "minio/minio:latest"],
    ports: ["55432:5432", "56379:6379", "59000:9000"],
    healthChecks: [
      { service: "postgres", command: "pg_isready -U agent" },
      { service: "redis", command: "redis-cli ping" },
      { service: "minio", command: "curl -f http://127.0.0.1:9000/minio/health/live" },
    ],
    env: {
      POSTGRES_URL: config.postgresUrl,
      REDIS_URL: config.redisUrl,
      MINIO_ENDPOINT: config.minioEndpoint,
      MINIO_BUCKET: config.minioBucket,
    },
  };
}

/** 生成 Testcontainers 风格测试步骤，不引入外部依赖。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function createIntegrationTestPlan(config) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    mode: config.dependencyMode,
    steps: [
      "start postgres container",
      "run schema migrations",
      "start redis container",
      "start minio container and create bucket",
      "run agent runtime integration tests",
      "collect logs and remove containers",
    ],
    assertions: [
      "can insert run/session/tool_call/evidence into Postgres",
      "can acquire and release Redis lease",
      "can upload evidence artifact to MinIO",
    ],
  };
}

/** CLI demo：展示配置、compose 计划和集成测试计划。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function runDemo() {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const config = loadConfig({
    dotenvText: "DEPENDENCY_MODE=compose\nMINIO_BUCKET=agent-artifacts\n",
  });
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 68,
    title: "real-dependency-integration",
    localOnly: true,
    config,
    compose: createComposePlan(config),
    integrationTestPlan: createIntegrationTestPlan(config),
  };
}
