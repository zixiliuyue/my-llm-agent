#!/usr/bin/env node
/**
 * Day 35：自包含学习源码。
 *
 * 这个文件属于 day35-prompt-to-image-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：演示 prompt 优化后的 ComfyUI handoff 结构。
import { runDemo } from "./index.js";

try {
  const message = process.argv.slice(2).join(" ") || undefined;
  console.log(JSON.stringify(runDemo(message), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
