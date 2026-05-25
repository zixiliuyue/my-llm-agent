#!/usr/bin/env node
// 学习目标：输出 ComfyUI 文生图请求结构，不要求真实 ComfyUI 在线。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
