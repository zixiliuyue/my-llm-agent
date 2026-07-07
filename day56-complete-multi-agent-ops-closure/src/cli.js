#!/usr/bin/env node
/**
 * Day 56：自包含学习源码。
 *
 * 这个文件属于 day56-complete-multi-agent-ops-closure，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：输出完整多 Agent 工程闭环 demo，展示 handoff、证据板和最终审计结论。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
