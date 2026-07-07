#!/usr/bin/env node
/**
 * Day 66：安全沙盒执行器 CLI。
 *
 * 默认只运行受限 JavaScript VM 和 Docker dry-run spec，不启动真实容器、不执行 Python。
 */
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
