/**
 * Day 3：自包含学习源码。
 *
 * 这个文件属于 day03-memory-and-rag，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from 'node:assert/strict';

// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { chunkMarkdown } from '../src/chunker.js';
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { retrieve } from '../src/retriever.js';
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { composeAnswer, runRag } from '../src/rag-agent.js';

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const chunks = chunkMarkdown(`# Notes

## agent loop
模型判断、工具调用、observation 回填。

## deployment
部署时使用环境变量切换接口。
`);

// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(chunks.length, 2);
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(chunks[0].title, 'agent loop');

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const matches = retrieve('agent loop observation', chunks);
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(matches[0].title, 'agent loop');
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(matches[0].score > 0);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const answer = composeAnswer('agent loop 是什么', matches);
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(answer.answer.includes('[chunk-1] agent loop'));

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const empty = composeAnswer('完全无关的问题', []);
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(empty.citations.length, 0);
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(empty.answer.includes('没有在本地知识库中检索到'));

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const result = await runRag({ question: 'agent loop', chunks });
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(result.matches[0].title, 'agent loop');

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log('day03 tests passed');

