#!/usr/bin/env node
/**
 * Day 10 CLI 入口。
 *
 * 这个文件负责把当天 demo 包成可执行命令。注释接近逐行，帮助新手理解 CLI 输入、输出和退出码。
 */
// 从当天核心逻辑导入三个函数：构造输入、运行 demo、校验结果。
import { createDemoInput, runDemo, validateDemo } from './index.js';

/** 打印当天命令行帮助。 */
function printUsage() {
  // 帮助信息输出到 stderr，避免污染 stdout 的结构化 JSON 结果。
  console.error('用法: npm start 或 npm run demo');
  // 明确说明不会调用真实模型，让学习者放心运行。
  console.error('说明: 本示例只运行本地 mock，不调用真实模型。');
}

// --help 和 -h 是常见帮助参数；只展示帮助，不执行 demo。
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  // 打印帮助文本。
  printUsage();
  // 正常退出，表示帮助命令执行成功。
  process.exit(0);
}

// process.argv.slice(2) 取用户在命令后输入的文本；没有输入时保留默认 message。
const input = createDemoInput({ message: process.argv.slice(2).join(' ') || undefined });
// runDemo 产生统一的教学结果对象。
const result = runDemo(input);
// validateDemo 做安全校验，防止 demo 缺少事件或 safeMode 被破坏。
const validation = validateDemo(result);
// 校验失败时输出错误，并设置非 0 退出码给 shell/CI 判断失败。
if (!validation.ok) {
  console.error('校验失败: ' + validation.error);
  process.exitCode = 1;
} else {
  // 过程提示走 stderr，stdout 只保留 JSON 结果。
  console.error('day10 demo ok: ' + result.lesson.title);
  // JSON.stringify 第三个参数 2 表示缩进 2 个空格，方便人阅读。
  console.log(JSON.stringify(result, null, 2));
}
