#!/usr/bin/env node
/**
 * Day 73：RAG 幻觉检测 CLI。
 */
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
