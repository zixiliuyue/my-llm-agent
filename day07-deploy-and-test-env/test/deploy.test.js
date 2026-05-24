import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildDockerDryRun,
  buildOllamaConfig,
  checkOllamaHealth,
  normalizeHost,
} from '../src/config.js';

assert.equal(normalizeHost('http://127.0.0.1:11434/'), 'http://127.0.0.1:11434');

assert.deepEqual(buildOllamaConfig({}), {
  host: 'http://127.0.0.1:11434',
  model: 'qwen2.5:7b',
  source: 'default-local',
});

assert.equal(buildOllamaConfig({
  OLLAMA_HOST: 'http://example.internal:11434',
  OLLAMA_MODEL: 'qwen2.5-coder:7b',
}).source, 'env');

const dryRun = buildDockerDryRun({ port: 18080, modelDir: '/data9/ollama' });
assert.ok(dryRun.includes('-p 18080:11434'));
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
assert.equal(health.ok, true);
assert.deepEqual(health.models, ['qwen2.5:7b']);

const source = await readFile(new URL('../src/config.js', import.meta.url), 'utf8');
const forbiddenHost = ['202', '81', '114', '3'].join('.');
assert.equal(source.includes(forbiddenHost), false);

console.log('day07 tests passed');
