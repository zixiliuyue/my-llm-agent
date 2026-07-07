#!/usr/bin/env node
/**
 * Day 42：自包含学习源码。
 *
 * 这个文件属于 day42-permission-aware-tools，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：演示 admin 预热 + 当前用户过滤的权限感知工具调用。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
