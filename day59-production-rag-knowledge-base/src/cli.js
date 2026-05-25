#!/usr/bin/env node
/**
 * Day 59：生产级 RAG / 知识库工程入口。
 *
 * 本文件只输出结构化 JSON，不连接真实向量库；pgvector schema 放在 README 里作为 Docker 模式草案。
 */
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { runDemo } from "./index.js";

// 教学：try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
try {
  // 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
  console.log(JSON.stringify(runDemo({ mode: process.argv.includes("--rag") ? "rag" : "demo" }), null, 2));
// 教学：catch 块：把异常转换成可理解的错误结果或退出码。
} catch (error) {
  // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
  console.error(error instanceof Error ? error.message : String(error));
  // 教学：退出进程：用退出码告诉 shell 当前命令成功还是失败。
  process.exitCode = 1;
}
