#!/usr/bin/env node
// 学习目标：输出一份观测诊断 demo，区分服务故障、数据源故障和权限故障。
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
