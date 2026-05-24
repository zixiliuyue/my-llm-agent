/**
 * Day 3：自包含学习源码。
 *
 * 这个文件属于 day03-memory-and-rag，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 教学：读取文件：教学示例从本地 Markdown 或配置里拿数据。
import { readFile } from 'node:fs/promises';
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { dirname, resolve } from 'node:path';
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { fileURLToPath } from 'node:url';

// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { chunkMarkdown } from './chunker.js';
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { retrieve } from './retriever.js';

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const __dirname = dirname(fileURLToPath(import.meta.url));
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const PROJECT_ROOT = resolve(__dirname, '..');

/** 读取本地知识库并切成检索片段。 */
// 教学：导出异步函数：调用方需要 await 它，因为内部可能读文件、请求接口或等待模型。
export async function loadKnowledge(path = resolve(PROJECT_ROOT, 'data/knowledge/agent-notes.md')) {
  // 教学：读取文件：教学示例从本地 Markdown 或配置里拿数据。
  const content = await readFile(path, 'utf8');
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return chunkMarkdown(content);
}

/** 根据检索命中片段组装带引用的回答。 */
// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function composeAnswer(question, matches) {
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!matches.length) {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return {
      answer: `没有在本地知识库中检索到和“${question}”足够相关的内容。`,
      citations: [],
    };
  }

  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const citations = matches.map((chunk) => `[${chunk.id}] ${chunk.title}`);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const keyPoints = matches
    .map((chunk) => `- ${chunk.text.replace(/\s+/g, ' ').slice(0, 160)}`)
    .join('\n');
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    answer: [
      `基于本地知识库，关于“${question}”：`,
      keyPoints,
      '',
      `引用：${citations.join('；')}`,
    ].join('\n'),
    citations,
  };
}

/** 执行本地 RAG 流程：加载知识、检索、生成引用回答。 */
// 教学：导出异步函数：调用方需要 await 它，因为内部可能读文件、请求接口或等待模型。
export async function runRag({ question, chunks } = {}) {
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!question || typeof question !== 'string') {
    // 教学：抛出错误：让调用方知道当前流程不能继续。
    throw new Error('question 不能为空');
  }
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const knowledgeChunks = chunks || await loadKnowledge();
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const matches = retrieve(question, knowledgeChunks);
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    question,
    matches,
    ...composeAnswer(question, matches),
  };
}

