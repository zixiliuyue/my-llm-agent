#!/usr/bin/env node
// 学习目标：输出一份权限缓存排障 demo，展示 Redis 权限、ACL snapshot 和当前用户过滤。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
