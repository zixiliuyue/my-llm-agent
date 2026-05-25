#!/usr/bin/env node
// 学习目标：输出 FramePack 本地视频实验建议和任务结构。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
