/**
 * Day 68：真实依赖集成测试与配置管理。
 *
 * 学习目标：展示 Agent 服务如何用 Docker Compose 或 Testcontainers 思路启动 Redis、
 * Postgres、MinIO 等真实依赖，并用 dotenv + schema 校验管理生产级配置。
 */

/** 解析 .env 文本；真实项目可替换 dotenv 包，这里保持自包含。 */
export function parseDotenv(text = "") {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    values[trimmed.slice(0, index)] = trimmed.slice(index + 1).replace(/^["']|["']$/g, "");
  }
  return values;
}

/** 加载并校验配置；类似 convict 的 schema + env override 思路。 */
export function loadConfig({ env = {}, dotenvText = "" } = {}) {
  const dotenv = parseDotenv(dotenvText);
  const merged = { ...dotenv, ...env };
  const config = {
    nodeEnv: merged.NODE_ENV || "test",
    // 安全边界：默认连接串仅用于本机 compose 演示（回环地址 + 演示口令），
    // 真实环境必须通过 POSTGRES_URL / REDIS_URL 等环境变量覆盖，禁止依赖此默认值。
    postgresUrl: merged.POSTGRES_URL || "postgres://agent:agent@127.0.0.1:55432/agent_ops",
    redisUrl: merged.REDIS_URL || "redis://127.0.0.1:56379/0",
    minioEndpoint: merged.MINIO_ENDPOINT || "http://127.0.0.1:59000",
    minioBucket: merged.MINIO_BUCKET || "agent-artifacts",
    dependencyMode: merged.DEPENDENCY_MODE || "compose",
  };
  const errors = validateConfig(config);
  if (errors.length > 0) throw new Error(`配置错误: ${errors.join("; ")}`);
  return config;
}

/** 校验连接字符串、环境枚举和 bucket。 */
export function validateConfig(config) {
  const errors = [];
  try {
    const postgres = new URL(config.postgresUrl);
    if (!["postgres:", "postgresql:"].includes(postgres.protocol)) errors.push("POSTGRES_URL must be postgres");
  } catch {
    errors.push("POSTGRES_URL invalid");
  }
  try {
    const redis = new URL(config.redisUrl);
    if (redis.protocol !== "redis:") errors.push("REDIS_URL must be redis");
  } catch {
    errors.push("REDIS_URL invalid");
  }
  if (!["compose", "testcontainers", "external"].includes(config.dependencyMode)) errors.push("DEPENDENCY_MODE invalid");
  if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(config.minioBucket)) errors.push("MINIO_BUCKET invalid");
  return errors;
}

/** 生成 Docker Compose 服务计划。 */
export function createComposePlan(config) {
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
export function createIntegrationTestPlan(config) {
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
export function runDemo() {
  const config = loadConfig({
    dotenvText: "DEPENDENCY_MODE=compose\nMINIO_BUCKET=agent-artifacts\n",
  });
  return {
    day: 68,
    title: "real-dependency-integration",
    localOnly: true,
    config,
    compose: createComposePlan(config),
    integrationTestPlan: createIntegrationTestPlan(config),
  };
}
