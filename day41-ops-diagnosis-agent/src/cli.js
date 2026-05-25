#!/usr/bin/env node
// 学习目标：输出一份基于 mock 指标/日志/发布记录的排障报告。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
