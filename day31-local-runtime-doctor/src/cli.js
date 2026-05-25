#!/usr/bin/env node
// 学习目标：把 day31 的本地环境检查结果以稳定 JSON 输出给学习者。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
