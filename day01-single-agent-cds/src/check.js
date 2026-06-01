#!/usr/bin/env node
/**
 * Day 1：自包含学习源码。
 *
 * 这个文件属于 day01-single-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { DEFAULT_MODEL, DEFAULT_OLLAMA_HOST, listOllamaModels } from './ollama-client.js';

/** 判断当前 Node 版本是否满足教学项目最低要求。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function nodeVersionOk(version) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version);
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!match) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return false;
  }
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const major = Number(match[1]);
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const minor = Number(match[2]);
  // 返回结果：调用方会拿到这个值继续后续流程。
  return major > 18 || (major === 18 && minor >= 17);
}

/** CLI 主入口，负责解析参数、调用当天示例并处理错误。 */
// 异步函数：里面会 await 异步操作，所以调用时也要等待结果。
async function main() {
  // 读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
  const host = process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST;
  // 读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
  const model = process.env.OLLAMA_MODEL || DEFAULT_MODEL;
  // 定义变量：这个值后面会被更新，所以使用 let。
  let failed = false;

  // 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
  console.log('LLM-Agent 本地环境自检');
  // 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
  console.log(`Node: ${process.version}`);
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!nodeVersionOk(process.version)) {
    // 输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
    console.error('Node 版本过低，请使用 Node 18.17 或更高版本。');
    failed = true;
  }

  // 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
  console.log(`Ollama Host: ${host}`);
  // 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
  console.log(`Ollama Model: ${model}`);

  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const models = await listOllamaModels({ host });
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!models.ok) {
    // 输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
    console.error(`无法访问 Ollama API: ${models.error}`);
    // 输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
    console.error('');
    // 输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
    console.error('建议执行：');
    // 输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
    console.error('  ollama serve');
    // 输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
    console.error(`  ollama pull ${model}`);
    // 退出进程：用退出码告诉 shell 当前命令成功还是失败。
    process.exitCode = 1;
    // 返回结果：调用方会拿到这个值继续后续流程。
    return;
  }

  // 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
  console.log(`已安装模型: ${models.models.length > 0 ? models.models.join(', ') : '(空)'}`);
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!models.models.includes(model)) {
    // 输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
    console.error(`未找到模型 ${model}`);
    // 输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
    console.error(`请执行: ollama pull ${model}`);
    failed = true;
  }

  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!failed) {
    // 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
    console.log('自检通过，可以运行: npm run ask -- "计算 (18+24)*3"');
  }
  // 退出进程：用退出码告诉 shell 当前命令成功还是失败。
  process.exitCode = failed ? 1 : 0;
}

// 等待异步操作完成：下一行代码依赖这个结果。
await main();
