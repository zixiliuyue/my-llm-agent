#!/usr/bin/env node
// 学习目标：输出图片队列状态 demo，供 smoke 测试使用。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
