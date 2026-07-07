#!/usr/bin/env node
/**
 * Day 1：自包含学习源码。
 *
 * 这个文件属于 day01-single-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
import { runAgent } from './agent.js';
import { DEFAULT_MODEL, DEFAULT_OLLAMA_HOST } from './ollama-client.js';

/** 打印当前 CLI 的用法说明，帮助学习者直接运行当天示例。 */
function printUsage() {
  console.error('用法: npm run ask -- "你的问题"');
  console.error('');
  console.error('示例:');
  console.error('  npm run ask -- "计算 (18+24)*3"');
  console.error('  npm run ask -- "什么是 agent loop"');
  console.error('');
  console.error('环境变量:');
  console.error(`  OLLAMA_HOST  默认 ${DEFAULT_OLLAMA_HOST}`);
  console.error(`  OLLAMA_MODEL 默认 ${DEFAULT_MODEL}`);
}

/** 把 agent 过程事件输出到 stderr，保持最终回答只走 stdout。 */
function logStep(event) {
  if (event.type === 'model_response') {
    console.error(`[step model_response ${event.step}] 模型返回: ${event.preview}`);
    return;
  }
  if (event.type === 'tool_call') {
    console.error(`[step  tool_call ${event.step}] 调用工具: ${event.tool}`);
    return;
  }
  if (event.type === 'observation') {
    console.error(`[step observation ${event.step}] 工具结果: ${event.preview}`);
    return;
  }
  if (event.type === 'retry') {
    console.error(`[step retry ${event.step}] 协议错误，回填给模型重试: ${event.message}`);
  }
}

/** CLI 主入口，负责解析参数、调用当天示例并处理错误。 */
async function main() {
  // 读取命令行参数：process.argv 前两项是 node 和脚本路径，所以业务参数通常从 slice(2) 开始。
  const question = process.argv.slice(2).join(' ').trim();
  console.log('main question', question);
  if (!question || question === '--help' || question === '-h') {
    printUsage();
    process.exitCode = question ? 0 : 2;
    return;
  }
  console.log('question question question', question);
  try {
    const answer = await runAgent({
      question,
      onStep: logStep,
    });
    console.log('answer answer answer', answer);
  } catch (error) {
    console.error(`执行失败: ${error.message}`);
    process.exitCode = 1;
  }
}

await main();
