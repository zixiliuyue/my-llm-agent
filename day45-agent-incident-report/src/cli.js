#!/usr/bin/env node
// 学习目标：输出结构化事故报告 JSON，其中 markdown 可直接放进复盘文档。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
