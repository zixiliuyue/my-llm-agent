#!/usr/bin/env node
/**
 * Day 6：自包含学习源码。
 *
 * 这个文件属于 day06-evaluation-observability，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
import { runEvaluations } from './eval-runner.js';

/** 打印当前 CLI 的用法说明，帮助学习者直接运行当天示例。 */
function printUsage() {
  console.error('用法: npm run day06:eval');
  console.error('默认使用 mock runner，不调用 Ollama。');
}

/** CLI 主入口，负责解析参数、调用当天示例并处理错误。 */
async function main() {
  // 读取命令行参数：process.argv 前两项是 node 和脚本路径，所以业务参数通常从 slice(2) 开始。
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    // 调用函数：把当前数据交给已有逻辑处理。
    printUsage();
    return;
  }
  const report = await runEvaluations();
  // 序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
  console.log(JSON.stringify(report, null, 2));
  if (report.summary.failed > 0) {
    process.exitCode = 1;
  }
}

await main();

