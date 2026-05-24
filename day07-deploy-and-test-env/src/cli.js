#!/usr/bin/env node
/**
 * Day 7：自包含学习源码。
 *
 * 这个文件属于 day07-deploy-and-test-env，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { buildDockerDryRun, buildOllamaConfig, checkOllamaHealth } from './config.js';

/** 打印当前 CLI 的用法说明，帮助学习者直接运行当天示例。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function printUsage() {
  // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
  console.error('用法:');
  // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
  console.error('  npm run day07:config');
  // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
  console.error('  npm run day07:health');
  // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
  console.error('  npm run day07:dry-run -- --port 11434 --model-dir /data9/ollama');
}

/** 从命令行参数中读取指定选项值。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function getArg(name) {
  // 教学：读取命令行参数：process.argv 前两项是 node 和脚本路径，所以业务参数通常从 slice(2) 开始。
  const index = process.argv.indexOf(name);
  // 教学：读取命令行参数：process.argv 前两项是 node 和脚本路径，所以业务参数通常从 slice(2) 开始。
  return index >= 0 ? process.argv[index + 1] : undefined;
}

/** CLI 主入口，负责解析参数、调用当天示例并处理错误。 */
// 教学：异步函数：里面会 await 异步操作，所以调用时也要等待结果。
async function main() {
  // 教学：读取命令行参数：process.argv 前两项是 node 和脚本路径，所以业务参数通常从 slice(2) 开始。
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return;
  }

  // 教学：读取命令行参数：process.argv 前两项是 node 和脚本路径，所以业务参数通常从 slice(2) 开始。
  if (process.argv.includes('--health')) {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const result = await checkOllamaHealth(buildOllamaConfig());
    // 教学：序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
    console.log(JSON.stringify(result, null, 2));
    // 教学：退出进程：用退出码告诉 shell 当前命令成功还是失败。
    process.exitCode = result.ok ? 0 : 1;
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return;
  }

  // 教学：读取命令行参数：process.argv 前两项是 node 和脚本路径，所以业务参数通常从 slice(2) 开始。
  if (process.argv.includes('--dry-run')) {
    // 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
    console.log(buildDockerDryRun({
      port: getArg('--port'),
      modelDir: getArg('--model-dir'),
    }));
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return;
  }

  // 教学：读取命令行参数：process.argv 前两项是 node 和脚本路径，所以业务参数通常从 slice(2) 开始。
  if (process.argv.includes('--config') || process.argv.length <= 2) {
    // 教学：序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
    console.log(JSON.stringify(buildOllamaConfig(), null, 2));
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return;
  }

  printUsage();
  // 教学：退出进程：用退出码告诉 shell 当前命令成功还是失败。
  process.exitCode = 2;
}

// 教学：等待异步操作完成：下一行代码依赖这个结果。
await main();

