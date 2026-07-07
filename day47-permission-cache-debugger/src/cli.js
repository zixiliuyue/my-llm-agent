#!/usr/bin/env node
/**
 * Day 47：自包含学习源码。
 *
 * 这个文件属于 day47-permission-cache-debugger，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：输出一份权限缓存排障 demo，展示 Redis 权限、ACL snapshot 和当前用户过滤。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
