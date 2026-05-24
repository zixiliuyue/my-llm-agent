/**
 * Day 3：自包含学习源码。
 *
 * 这个文件属于 day03-memory-and-rag，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
#!/usr/bin/env node
import { runRag } from './rag-agent.js';

function printUsage() {
  console.error('用法: npm run day03:ask -- "你的问题"');
  console.error('');
  console.error('示例:');
  console.error('  npm run day03:ask -- "什么是 agent loop"');
}

async function main() {
  const question = process.argv.slice(2).join(' ').trim();
  if (!question || question === '--help' || question === '-h') {
    printUsage();
    process.exitCode = question ? 0 : 2;
    return;
  }

  try {
    const result = await runRag({ question });
    console.error(`检索到 ${result.matches.length} 个 chunk`);
    for (const match of result.matches) {
      console.error(`- ${match.id} ${match.title} score=${match.score}`);
    }
    console.log(result.answer);
  } catch (error) {
    console.error(`执行失败: ${error.message}`);
    process.exitCode = 1;
  }
}

await main();

