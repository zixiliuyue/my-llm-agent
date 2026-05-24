#!/usr/bin/env node
import { runAgent } from './agent.js';
import { DEFAULT_MODEL, DEFAULT_OLLAMA_HOST } from './ollama-client.js';

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

function logStep(event) {
  if (event.type === 'model_response') {
    console.error(`[step ${event.step}] 模型返回: ${event.preview}`);
    return;
  }
  if (event.type === 'tool_call') {
    console.error(`[step ${event.step}] 调用工具: ${event.tool}`);
    return;
  }
  if (event.type === 'observation') {
    console.error(`[step ${event.step}] 工具结果: ${event.preview}`);
    return;
  }
  if (event.type === 'retry') {
    console.error(`[step ${event.step}] 协议错误，回填给模型重试: ${event.message}`);
  }
}

async function main() {
  const question = process.argv.slice(2).join(' ').trim();
  if (!question || question === '--help' || question === '-h') {
    printUsage();
    process.exitCode = question ? 0 : 2;
    return;
  }

  try {
    const answer = await runAgent({
      question,
      onStep: logStep,
    });
    console.log(answer);
  } catch (error) {
    console.error(`执行失败: ${error.message}`);
    process.exitCode = 1;
  }
}

await main();
