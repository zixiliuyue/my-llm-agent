#!/usr/bin/env node
// 学习目标：输出一份测试环境发布后验证 demo，判断通过、观察或回滚。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
