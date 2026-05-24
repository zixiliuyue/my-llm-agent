/**
 * Day 2：自包含学习源码。
 *
 * 这个文件属于 day02-multi-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
#!/usr/bin/env node
import { runMultiAgent } from './multi-agent.js';

/** 打印当前 CLI 的用法说明，帮助学习者直接运行当天示例。 */
function printUsage() {
  console.error('用法: npm run day02:ask -- "你的问题"');
  console.error('');
  console.error('示例:');
  console.error('  npm run day02:ask -- "计算 (18+24)*3"');
  console.error('');
  console.error('环境变量:');
  console.error('  OLLAMA_HOST  默认 http://127.0.0.1:11434');
  console.error('  OLLAMA_MODEL 默认 qwen2.5:7b');
}

/** 把多 agent 交接事件输出到 stderr，便于观察角色协作过程。 */
function logEvent(event) {
  if (event.type === 'tool_call') {
    console.error(`[${event.role}] 调用工具 ${event.tool} (${event.id})`);
    return;
  }
  console.error(`[${event.role}] ${event.type}: ${event.preview}`);
}

/** CLI 主入口，负责解析参数、调用当天示例并处理错误。 */
async function main() {
  const question = process.argv.slice(2).join(' ').trim();
  if (!question || question === '--help' || question === '-h') {
    printUsage();
    process.exitCode = question ? 0 : 2;
    return;
  }

  try {
    const result = await runMultiAgent({ question, onEvent: logEvent });
    console.log(result.answer);
  } catch (error) {
    console.error(`执行失败: ${error.message}`);
    process.exitCode = 1;
  }
}

await main();

