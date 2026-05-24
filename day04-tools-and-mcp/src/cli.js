/**
 * Day 4：自包含学习源码。
 *
 * 这个文件属于 day04-tools-and-mcp，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
#!/usr/bin/env node
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
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

/** CLI 主入口，负责解析参数、调用当天示例并处理错误。 */
async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    return;
  }
  if (process.argv.includes('--list')) {
    console.log(JSON.stringify(listTools(), null, 2));
    return;
  }
  if (process.argv.includes('--mcp')) {
    console.log(JSON.stringify(listMockMcpTools(), null, 2));
    return;
  }

  const toolName = getArg('--call');
  if (!toolName) {
    printUsage();
    process.exitCode = 2;
    return;
  }

  let input = {};
  const rawInput = getArg('--input');
  if (rawInput) {
    try {
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
  console.log(JSON.stringify(result.data, null, 2));
}

await main();

