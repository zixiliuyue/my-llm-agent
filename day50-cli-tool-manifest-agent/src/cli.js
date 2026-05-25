#!/usr/bin/env node
// 学习目标：输出一份 CLI 工具 manifest demo，展示 Agent 如何安全规划命令。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
