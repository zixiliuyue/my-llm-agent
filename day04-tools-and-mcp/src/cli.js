#!/usr/bin/env node
/**
 * Day 4：自包含学习源码。
 *
 * 这个文件属于 day04-tools-and-mcp，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
import { callRegisteredTool, listMockMcpTools, listTools } from './tool-registry.js';

/** 打印当前 CLI 的用法说明，帮助学习者直接运行当天示例。 */
function printUsage() {
  console.error('用法:');
  console.error('  npm run day04:tools -- --list');
  console.error('  npm run day04:tools -- --mcp');
  console.error('  npm run day04:tools -- --call calculator --input \'{"expression":"2+3"}\'');
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
  if (process.argv.includes('--list')) {
    // 序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
    console.log(JSON.stringify(listTools(), null, 2));
    return;
  }
  // 读取命令行参数：process.argv 前两项是 node 和脚本路径，所以业务参数通常从 slice(2) 开始。
  if (process.argv.includes('--mcp')) {
    // 序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
    console.log(JSON.stringify(listMockMcpTools(), null, 2));
    return;
  }

  const toolName = getArg('--call');
  if (!toolName) {
    // 调用函数：把当前数据交给已有逻辑处理。
    printUsage();
    process.exitCode = 2;
    return;
  }

  let input = {};
  const rawInput = getArg('--input');
  if (rawInput) {
    try {
      // 解析 JSON：把字符串还原成 JS 对象，方便后续读取字段。
      input = JSON.parse(rawInput);
    } catch (error) {
      console.error(`input 必须是 JSON 对象: ${error.message}`);
      process.exitCode = 2;
      return;
    }
  }

  const result = await callRegisteredTool(toolName, input);
  if (!result.ok) {
    console.error(result.error);
    process.exitCode = result.blocked ? 3 : 1;
    return;
  }
  // 序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
  console.log(JSON.stringify(result.data, null, 2));
}

await main();

