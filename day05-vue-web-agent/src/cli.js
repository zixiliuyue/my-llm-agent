#!/usr/bin/env node
/**
 * Day 5：自包含学习源码。
 *
 * 这个文件属于 day05-vue-web-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
/**
 * Day 05：目录说明 CLI。
 *
 * 真正的 API server 仍然通过 `npm start` 启动；这个 CLI 用于统一
 * 30 天项目结构，帮助学习者快速查看 day05 的组成。
 */
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { describeDay05 } from './index.js';

// 读取命令行参数：process.argv 前两项是 node 和脚本路径，所以业务参数通常从 slice(2) 开始。
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  // 输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
  console.error('用法: node src/cli.js');
  // 输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
  console.error('说明: 查看 day05 Web Agent 的目录组成。');
  // 退出进程：用退出码告诉 shell 当前命令成功还是失败。
  process.exit(0);
}

// 序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
console.log(JSON.stringify(describeDay05(), null, 2));

