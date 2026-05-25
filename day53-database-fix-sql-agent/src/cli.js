#!/usr/bin/env node
// 学习目标：输出一份数据库修复 SQL 草案，只生成 SQL、回滚 SQL 和风险说明，不执行。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
