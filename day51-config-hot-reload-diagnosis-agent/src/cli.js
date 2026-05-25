#!/usr/bin/env node
// 学习目标：输出一份配置热更新诊断 demo，判断配置是否真的 reload，而不是靠重启蒙混过关。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
