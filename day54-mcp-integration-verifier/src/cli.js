#!/usr/bin/env node
/**
 * Day 54：自包含学习源码。
 *
 * 这个文件属于 day54-mcp-integration-verifier，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：输出一份 MCP 接入验真 demo，区分 URL 可访问和 MCP 协议可用。
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { runDemo } from "./index.js";

// try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
try {
  // 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
  console.log(JSON.stringify(runDemo(), null, 2));
// catch 块：把异常转换成可理解的错误结果或退出码。
} catch (error) {
  // 输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
  console.error(error instanceof Error ? error.message : String(error));
  // 退出进程：用退出码告诉 shell 当前命令成功还是失败。
  process.exitCode = 1;
}
