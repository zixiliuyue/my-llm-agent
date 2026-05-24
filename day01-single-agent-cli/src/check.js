#!/usr/bin/env node
import { DEFAULT_MODEL, DEFAULT_OLLAMA_HOST, listOllamaModels } from './ollama-client.js';

function nodeVersionOk(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) {
    return false;
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return major > 18 || (major === 18 && minor >= 17);
}

async function main() {
  const host = process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST;
  const model = process.env.OLLAMA_MODEL || DEFAULT_MODEL;
  let failed = false;

  console.log('LLM-Agent 本地环境自检');
  console.log(`Node: ${process.version}`);
  if (!nodeVersionOk(process.version)) {
    console.error('Node 版本过低，请使用 Node 18.17 或更高版本。');
    failed = true;
  }

  console.log(`Ollama Host: ${host}`);
  console.log(`Ollama Model: ${model}`);

  const models = await listOllamaModels({ host });
  if (!models.ok) {
    console.error(`无法访问 Ollama API: ${models.error}`);
    console.error('');
    console.error('建议执行：');
    console.error('  ollama serve');
    console.error(`  ollama pull ${model}`);
    process.exitCode = 1;
    return;
  }

  console.log(`已安装模型: ${models.models.length > 0 ? models.models.join(', ') : '(空)'}`);
  if (!models.models.includes(model)) {
    console.error(`未找到模型 ${model}`);
    console.error(`请执行: ollama pull ${model}`);
    failed = true;
  }

  if (!failed) {
    console.log('自检通过，可以运行: npm run ask -- "计算 (18+24)*3"');
  }
  process.exitCode = failed ? 1 : 0;
}

await main();
