#!/usr/bin/env node
// 学习目标：输出一份事故复盘质量评估 demo，检查报告是否完整、可审计且已脱敏。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
