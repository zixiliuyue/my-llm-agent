import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chunkMarkdown } from './chunker.js';
import { retrieve } from './retriever.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

export async function loadKnowledge(path = resolve(PROJECT_ROOT, 'data/knowledge/agent-notes.md')) {
  const content = await readFile(path, 'utf8');
  return chunkMarkdown(content);
}

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

