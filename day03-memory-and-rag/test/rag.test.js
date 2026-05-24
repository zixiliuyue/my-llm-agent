import assert from 'node:assert/strict';

import { chunkMarkdown } from '../src/chunker.js';
import { retrieve } from '../src/retriever.js';
import { composeAnswer, runRag } from '../src/rag-agent.js';

const chunks = chunkMarkdown(`# Notes

## agent loop
模型判断、工具调用、observation 回填。

## deployment
部署时使用环境变量切换接口。
`);

assert.equal(chunks.length, 2);
assert.equal(chunks[0].title, 'agent loop');

const matches = retrieve('agent loop observation', chunks);
assert.equal(matches[0].title, 'agent loop');
assert.ok(matches[0].score > 0);

const answer = composeAnswer('agent loop 是什么', matches);
assert.ok(answer.answer.includes('[chunk-1] agent loop'));

const empty = composeAnswer('完全无关的问题', []);
assert.equal(empty.citations.length, 0);
assert.ok(empty.answer.includes('没有在本地知识库中检索到'));

const result = await runRag({ question: 'agent loop', chunks });
assert.equal(result.matches[0].title, 'agent loop');

console.log('day03 tests passed');

