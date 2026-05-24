/**
 * Day 3：自包含学习源码。
 *
 * 这个文件属于 day03-memory-and-rag，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chunkMarkdown } from './chunker.js';
import { retrieve } from './retriever.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

/** 读取本地知识库并切成检索片段。 */
export async function loadKnowledge(path = resolve(PROJECT_ROOT, 'data/knowledge/agent-notes.md')) {
  const content = await readFile(path, 'utf8');
  return chunkMarkdown(content);
}

/** 根据检索命中片段组装带引用的回答。 */
export function composeAnswer(question, matches) {
  if (!matches.length) {
    return {
      answer: `没有在本地知识库中检索到和“${question}”足够相关的内容。`,
      citations: [],
    };
  }

  const citations = matches.map((chunk) => `[${chunk.id}] ${chunk.title}`);
  const keyPoints = matches
    .map((chunk) => `- ${chunk.text.replace(/\s+/g, ' ').slice(0, 160)}`)
    .join('\n');
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
export async function runRag({ question, chunks } = {}) {
  if (!question || typeof question !== 'string') {
    throw new Error('question 不能为空');
  }
  const knowledgeChunks = chunks || await loadKnowledge();
  const matches = retrieve(question, knowledgeChunks);
  return {
    question,
    matches,
    ...composeAnswer(question, matches),
  };
}

