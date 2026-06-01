/**
 * Day 7：自包含学习源码。
 *
 * 这个文件属于 day07-deploy-and-test-env，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from 'node:assert/strict';
// 读取文件：教学示例从本地 Markdown 或配置里拿数据。
import { readFile } from 'node:fs/promises';

// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import {
  buildDockerDryRun,
  buildOllamaConfig,
  checkOllamaHealth,
  normalizeHost,
} from '../src/config.js';

// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(normalizeHost('http://127.0.0.1:11434/'), 'http://127.0.0.1:11434');

// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.deepEqual(buildOllamaConfig({}), {
  host: 'http://127.0.0.1:11434',
  model: 'qwen2.5:7b',
  source: 'default-local',
});

// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(buildOllamaConfig({
  OLLAMA_HOST: 'http://example.internal:11434',
  OLLAMA_MODEL: 'qwen2.5-coder:7b',
}).source, 'env');

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const dryRun = buildDockerDryRun({ port: 18080, modelDir: '/data9/ollama' });
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(dryRun.includes('-p 18080:11434'));
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(dryRun.includes('-v /data9/ollama:/root/.ollama'));

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const health = await checkOllamaHealth({
  host: 'http://mock.local',
  fetchImpl: async () => ({
    ok: true,
    async json() {
      // 返回结果：调用方会拿到这个值继续后续流程。
      return { models: [{ name: 'qwen2.5:7b' }] };
    },
  }),
});
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(health.ok, true);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.deepEqual(health.models, ['qwen2.5:7b']);

// 读取文件：教学示例从本地 Markdown 或配置里拿数据。
const source = await readFile(new URL('../src/config.js', import.meta.url), 'utf8');
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const forbiddenHost = ['202', '81', '114', '3'].join('.');
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(source.includes(forbiddenHost), false);

// 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log('day07 tests passed');
