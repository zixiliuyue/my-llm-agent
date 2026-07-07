#!/usr/bin/env node
/**
 * Day 67：Human-in-the-Loop 审批闭环 CLI。
 *
 * 默认使用内存 webhook 决策，不发送 Slack/邮件，不监听公网端口。
 */
import { runDemo } from "./index.js";

try {
  console.log(JSON.stringify(runDemo(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
