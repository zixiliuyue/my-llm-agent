#!/usr/bin/env node
// 学习目标：演示 admin 预热 + 当前用户过滤的权限感知工具调用。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
