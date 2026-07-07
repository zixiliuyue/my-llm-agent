#!/usr/bin/env node
/**
 * Day 55：自包含学习源码。
 *
 * 这个文件属于 day55-incident-retro-quality-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：输出一份事故复盘质量评估 demo，检查报告是否完整、可审计且已脱敏。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
