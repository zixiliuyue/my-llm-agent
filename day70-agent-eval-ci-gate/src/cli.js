#!/usr/bin/env node
/**
 * Day 70：Agent Eval CI Gate CLI。
 */
import { runCiGate, runDemo } from "./index.js";

try {
  const output = process.argv.includes("--ci") ? runCiGate() : runDemo();
  console.log(JSON.stringify(output, null, 2));
  if (process.argv.includes("--ci") && output.ok === false) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
