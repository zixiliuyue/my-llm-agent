#!/usr/bin/env node
/**
 * Day 68：真实依赖集成测试与配置管理 CLI。
 *
 * 默认只输出 Docker Compose / Testcontainers 风格计划，不启动真实 Redis/Postgres/MinIO。
 */
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
