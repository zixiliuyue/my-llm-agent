/**
 * Day 3：自包含学习源码。
 *
 * 这个文件属于 day03-memory-and-rag，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
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

// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(chunks.length, 2);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(chunks[0].title, 'agent loop');

const matches = retrieve('agent loop observation', chunks);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(matches[0].title, 'agent loop');
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(matches[0].score > 0);

const answer = composeAnswer('agent loop 是什么', matches);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(answer.answer.includes('[chunk-1] agent loop'));

const empty = composeAnswer('完全无关的问题', []);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(empty.citations.length, 0);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(empty.answer.includes('没有在本地知识库中检索到'));

const result = await runRag({ question: 'agent loop', chunks });
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(result.matches[0].title, 'agent loop');

console.log('day03 tests passed');

