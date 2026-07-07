#!/usr/bin/env node
/**
 * Day 40：自包含学习源码。
 *
 * 这个文件属于 day40-wan-video-evaluation，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：输出 Wan2.1 与本地视频路径的评估结果。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
