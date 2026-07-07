#!/usr/bin/env node
/**
 * Day 61：Agent 安全沙盒入口。
 *
 * 默认 dry-run，只输出安全决策 JSON，不启动容器、不写真实文件、不访问网络。
 */
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
