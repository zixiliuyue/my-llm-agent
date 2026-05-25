#!/usr/bin/env node
// 学习目标：输出一份 MCP 接入验真 demo，区分 URL 可访问和 MCP 协议可用。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
