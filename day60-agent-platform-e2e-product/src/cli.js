#!/usr/bin/env node
/**
 * Day 60：端到端 Agent 产品样板 CLI。
 *
 * 输出包含 run、tool call、approval、RAG citation、evidence board、final report 的结构化 JSON。
 */
import { runProductDemo } from "./index.js";

try {
  console.log(JSON.stringify(runProductDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
