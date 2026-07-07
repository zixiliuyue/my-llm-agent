#!/usr/bin/env node
/**
 * Day 69：OpenTelemetry 风格 Agent Runtime 可观测性 CLI。
 */
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
