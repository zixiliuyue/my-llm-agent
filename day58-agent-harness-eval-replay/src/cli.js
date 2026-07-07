#!/usr/bin/env node
/**
 * Day 58：自包含学习源码。
 *
 * 这个文件属于 day58-agent-harness-eval-replay，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：输出 Agent Harness 的 replay、compare、golden dataset 和 CI gate 结果。
import { runDemo, runGate } from "./index.js";

const gateMode = process.argv.includes("--gate");

try {
  const result = gateMode ? runGate() : runDemo();
  console.log(JSON.stringify(result, null, 2));
  if (gateMode && !result.ok) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
