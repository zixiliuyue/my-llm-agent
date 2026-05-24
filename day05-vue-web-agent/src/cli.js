#!/usr/bin/env node
/**
 * Day 05：目录说明 CLI。
 *
 * 真正的 API server 仍然通过 `npm start` 启动；这个 CLI 用于统一
 * 30 天项目结构，帮助学习者快速查看 day05 的组成。
 */
import { describeDay05 } from './index.js';

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.error('用法: node src/cli.js');
  console.error('说明: 查看 day05 Web Agent 的目录组成。');
  process.exit(0);
}

console.log(JSON.stringify(describeDay05(), null, 2));

