#!/usr/bin/env node
/**
 * Day 53：自包含学习源码。
 *
 * 这个文件属于 day53-database-fix-sql-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：输出一份数据库修复 SQL 草案，只生成 SQL、回滚 SQL 和风险说明，不执行。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
