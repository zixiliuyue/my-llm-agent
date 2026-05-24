#!/usr/bin/env node
/**
 * Day 7：自包含学习源码。
 *
 * 这个文件属于 day07-deploy-and-test-env，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
import { buildDockerDryRun, buildOllamaConfig, checkOllamaHealth } from './config.js';

/** 打印当前 CLI 的用法说明，帮助学习者直接运行当天示例。 */
function printUsage() {
  console.error('用法:');
  console.error('  npm run day07:config');
  console.error('  npm run day07:health');
  console.error('  npm run day07:dry-run -- --port 11434 --model-dir /data9/ollama');
}

/** 从命令行参数中读取指定选项值。 */
function getArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

/** CLI 主入口，负责解析参数、调用当天示例并处理错误。 */
async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    return;
  }

  if (process.argv.includes('--health')) {
    const result = await checkOllamaHealth(buildOllamaConfig());
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
    return;
  }

  if (process.argv.includes('--dry-run')) {
    console.log(buildDockerDryRun({
      port: getArg('--port'),
      modelDir: getArg('--model-dir'),
    }));
    return;
  }

  if (process.argv.includes('--config') || process.argv.length <= 2) {
    console.log(JSON.stringify(buildOllamaConfig(), null, 2));
    return;
  }

  printUsage();
  process.exitCode = 2;
}

await main();

