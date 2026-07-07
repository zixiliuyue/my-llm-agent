#!/usr/bin/env node
/**
 * Day 64：生产级模型 Provider Router CLI。
 */
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(await runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
