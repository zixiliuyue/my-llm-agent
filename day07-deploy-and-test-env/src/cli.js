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
  // 读取命令行参数：process.argv 前两项是 node 和脚本路径，所以业务参数通常从 slice(2) 开始。
  const index = process.argv.indexOf(name);
  // 读取命令行参数：process.argv 前两项是 node 和脚本路径，所以业务参数通常从 slice(2) 开始。
  return index >= 0 ? process.argv[index + 1] : undefined;
}

/** CLI 主入口，负责解析参数、调用当天示例并处理错误。 */
async function main() {
  // 读取命令行参数：process.argv 前两项是 node 和脚本路径，所以业务参数通常从 slice(2) 开始。
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    // 调用函数：把当前数据交给已有逻辑处理。
    printUsage();
    return;
  }

  // 读取命令行参数：process.argv 前两项是 node 和脚本路径，所以业务参数通常从 slice(2) 开始。
  if (process.argv.includes('--health')) {
    const result = await checkOllamaHealth(buildOllamaConfig());
    // 序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
    return;
  }

  // 读取命令行参数：process.argv 前两项是 node 和脚本路径，所以业务参数通常从 slice(2) 开始。
  if (process.argv.includes('--dry-run')) {
    console.log(buildDockerDryRun({
      port: getArg('--port'),
      modelDir: getArg('--model-dir'),
    }));
    return;
  }

  // 读取命令行参数：process.argv 前两项是 node 和脚本路径，所以业务参数通常从 slice(2) 开始。
  if (process.argv.includes('--config') || process.argv.length <= 2) {
    // 序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
    console.log(JSON.stringify(buildOllamaConfig(), null, 2));
    return;
  }

  // 调用函数：把当前数据交给已有逻辑处理。
  printUsage();
  process.exitCode = 2;
}

await main();

