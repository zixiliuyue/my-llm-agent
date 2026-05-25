#!/usr/bin/env node
// 学习目标：输出一份远程执行审批计划 demo，展示 blocked、approval 和 dry-run 边界。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
