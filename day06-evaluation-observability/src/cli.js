/**
 * Day 6：自包含学习源码。
 *
 * 这个文件属于 day06-evaluation-observability，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
#!/usr/bin/env node
import { runEvaluations } from './eval-runner.js';

function printUsage() {
  console.error('用法: npm run day06:eval');
  console.error('默认使用 mock runner，不调用 Ollama。');
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    return;
  }
  const report = await runEvaluations();
  console.log(JSON.stringify(report, null, 2));
  if (report.summary.failed > 0) {
    process.exitCode = 1;
  }
}

await main();

