#!/usr/bin/env node
/**
 * Day 59：生产级 RAG / 知识库工程入口。
 *
 * 本文件只输出结构化 JSON，不连接真实向量库；pgvector schema 放在 README 里作为 Docker 模式草案。
 */
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo({ mode: process.argv.includes("--rag") ? "rag" : "demo" }), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
