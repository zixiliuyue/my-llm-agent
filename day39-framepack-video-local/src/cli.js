#!/usr/bin/env node
/**
 * Day 39：自包含学习源码。
 *
 * 这个文件属于 day39-framepack-video-local，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：输出 FramePack 本地视频实验建议和任务结构。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
