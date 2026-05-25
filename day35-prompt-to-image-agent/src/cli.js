#!/usr/bin/env node
// 学习目标：演示 prompt 优化后的 ComfyUI handoff 结构。
import { runDemo } from "./index.js";

try {
  const message = process.argv.slice(2).join(" ") || undefined;
  console.log(JSON.stringify(runDemo(message), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
