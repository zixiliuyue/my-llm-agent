#!/usr/bin/env node
/**
 * Day 62：多 Agent 编排 Runtime CLI。
 *
 * 输出 DAG、handoff、fan-out/fan-in、冲突检测和失败恢复路径。
 */
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
