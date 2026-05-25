#!/usr/bin/env node
/**
 * Day 4：自包含学习源码。
 *
 * 这个文件属于 day04-tools-and-mcp，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { callRegisteredTool, listMockMcpTools, listTools } from './tool-registry.js';

/** 打印当前 CLI 的用法说明，帮助学习者直接运行当天示例。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function printUsage() {
  // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
  console.error('用法:');
  // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
  console.error('  npm run day04:tools -- --list');
  // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
  console.error('  npm run day04:tools -- --mcp');
  // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
  console.error('  npm run day04:tools -- --call calculator --input \'{"expression":"2+3"}\'');
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
    // 教学：调用函数：把当前数据交给已有逻辑处理。
    printUsage();
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return;
  }
  // 教学：读取命令行参数：process.argv 前两项是 node 和脚本路径，所以业务参数通常从 slice(2) 开始。
  if (process.argv.includes('--list')) {
    // 教学：序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
    console.log(JSON.stringify(listTools(), null, 2));
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return;
  }
  // 教学：读取命令行参数：process.argv 前两项是 node 和脚本路径，所以业务参数通常从 slice(2) 开始。
  if (process.argv.includes('--mcp')) {
    // 教学：序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
    console.log(JSON.stringify(listMockMcpTools(), null, 2));
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return;
  }

  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const toolName = getArg('--call');
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!toolName) {
    // 教学：调用函数：把当前数据交给已有逻辑处理。
    printUsage();
    // 教学：退出进程：用退出码告诉 shell 当前命令成功还是失败。
    process.exitCode = 2;
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return;
  }

  // 教学：定义变量：这个值后面会被更新，所以使用 let。
  let input = {};
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const rawInput = getArg('--input');
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (rawInput) {
    // 教学：try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
    try {
      // 教学：解析 JSON：把字符串还原成 JS 对象，方便后续读取字段。
      input = JSON.parse(rawInput);
    // 教学：catch 块：把异常转换成可理解的错误结果或退出码。
    } catch (error) {
      // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
      console.error(`input 必须是 JSON 对象: ${error.message}`);
      // 教学：退出进程：用退出码告诉 shell 当前命令成功还是失败。
      process.exitCode = 2;
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return;
    }
  }

  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const result = await callRegisteredTool(toolName, input);
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!result.ok) {
    // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
    console.error(result.error);
    // 教学：退出进程：用退出码告诉 shell 当前命令成功还是失败。
    process.exitCode = result.blocked ? 3 : 1;
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return;
  }
  // 教学：序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
  console.log(JSON.stringify(result.data, null, 2));
}

// 教学：等待异步操作完成：下一行代码依赖这个结果。
await main();

