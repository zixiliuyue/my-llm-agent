/**
 * Day 7：自包含学习源码。
 *
 * 这个文件属于 day07-deploy-and-test-env，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
import assert from 'node:assert/strict';
// 读取文件：教学示例从本地 Markdown 或配置里拿数据。
import { readFile } from 'node:fs/promises';

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

const dryRun = buildDockerDryRun({ port: 18080, modelDir: '/data9/ollama' });
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(dryRun.includes('-p 18080:11434'));
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(dryRun.includes('-v /data9/ollama:/root/.ollama'));

const health = await checkOllamaHealth({
  host: 'http://mock.local',
  fetchImpl: async () => ({
    ok: true,
    async json() {
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
const forbiddenHost = ['202', '81', '114', '3'].join('.');
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(source.includes(forbiddenHost), false);

console.log('day07 tests passed');
