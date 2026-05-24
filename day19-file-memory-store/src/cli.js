#!/usr/bin/env node
/**
 * Day 19 CLI 入口。
 *
 * CLI 只负责把当天 demo 结果打印出来。过程提示输出到 stderr，
 * 结构化结果输出到 stdout，保持和前面 day 的 stdout/stderr 约定一致。
 */
import { createDemoInput, runDemo, validateDemo } from './index.js';

/** 打印当天命令行帮助。 */
function printUsage() {
  console.error('用法: npm start 或 npm run demo');
  console.error('说明: 本示例只运行本地 mock，不调用真实模型。');
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  printUsage();
  process.exit(0);
}

const input = createDemoInput({ message: process.argv.slice(2).join(' ') || undefined });
const result = runDemo(input);
const validation = validateDemo(result);
if (!validation.ok) {
  console.error('校验失败: ' + validation.error);
  process.exitCode = 1;
} else {
  console.error('day19 demo ok: ' + result.lesson.title);
  console.log(JSON.stringify(result, null, 2));
}
