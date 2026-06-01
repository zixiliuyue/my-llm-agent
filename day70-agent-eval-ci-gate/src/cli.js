#!/usr/bin/env node
/**
 * Day 70：Agent Eval CI Gate CLI。
 */
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { runCiGate, runDemo } from "./index.js";

// try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
try {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const output = process.argv.includes("--ci") ? runCiGate() : runDemo();
  // 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
  console.log(JSON.stringify(output, null, 2));
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (process.argv.includes("--ci") && output.ok === false) process.exitCode = 1;
// catch 块：把异常转换成可理解的错误结果或退出码。
} catch (error) {
  // 输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
  console.error(error instanceof Error ? error.message : String(error));
  // 退出进程：用退出码告诉 shell 当前命令成功还是失败。
  process.exitCode = 1;
}
