#!/usr/bin/env node
// 学习目标：输出 Wan2.1 与本地视频路径的评估结果。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
