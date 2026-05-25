#!/usr/bin/env node
/**
 * mini-openclaw 本地环境自检。
 *
 * 本脚本只做只读检查：不安装 Ollama、不拉模型、不修改显卡驱动。
 */
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const MIN_NODE_VERSION = [18, 17, 0];
const DEFAULT_OLLAMA_HOST = 'http://127.0.0.1:11434';
const DEFAULT_COMFYUI_HOST = 'http://127.0.0.1:8188';
const DEFAULT_FRAMEPACK_HOST = 'http://127.0.0.1:7860';
const DEFAULT_MODEL = 'qwen2.5:7b';
const OLLAMA_HOST = String(process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST).replace(/\/+$/, '');
const COMFYUI_HOST = String(process.env.COMFYUI_HOST || DEFAULT_COMFYUI_HOST).replace(/\/+$/, '');
const FRAMEPACK_HOST = String(process.env.FRAMEPACK_HOST || DEFAULT_FRAMEPACK_HOST).replace(/\/+$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || DEFAULT_MODEL;
const NPM_COMMAND = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

function parseVersion(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(version || ''));
  return match ? match.slice(1).map(Number) : [0, 0, 0];
}

function versionAtLeast(actual, expected) {
  for (let index = 0; index < expected.length; index += 1) {
    if (actual[index] > expected[index]) return true;
    if (actual[index] < expected[index]) return false;
  }
  return true;
}

function run(command, args = [], timeoutMs = 5000) {
  return new Promise((resolve) => {
    const child = execFile(command, args, { timeout: timeoutMs }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        stdout: String(stdout || '').trim(),
        stderr: String(stderr || '').trim(),
        error: error ? error.message : '',
      });
    });
    child.on('error', (error) => {
      resolve({ ok: false, stdout: '', stderr: '', error: error.message });
    });
  });
}

function isLocalHttpUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && LOCAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

async function fetchJson(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    return { ok: response.ok, status: response.status, body };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url, timeoutMs = 3000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text };
  } finally {
    clearTimeout(timer);
  }
}

function print(status, message) {
  console.log(`${status.padEnd(5)} ${message}`);
}

function printOllamaHint() {
  print('INFO', 'Ollama 准备命令：');
  console.log(`      ollama serve`);
  console.log(`      ollama pull ${OLLAMA_MODEL}`);
}

function checkLocalEndpoint(name, value) {
  if (isLocalHttpUrl(value)) {
    print('OK', `${name} 本地地址: ${value}`);
    return true;
  }
  print('WARN', `${name} 不是 localhost/127.0.0.1: ${value}`);
  print('INFO', `${name} 学习项目只建议指向本机服务，避免误调用云端或远程机器。`);
  return false;
}

async function checkNode() {
  const version = parseVersion(process.version);
  if (versionAtLeast(version, MIN_NODE_VERSION)) {
    print('OK', `Node.js ${process.version}`);
    return true;
  }
  print('FAIL', `Node.js ${process.version} 低于 18.17，请升级后再运行项目`);
  return false;
}

async function checkNpm() {
  const result = await run(NPM_COMMAND, ['--version']);
  if (result.ok && result.stdout) {
    print('OK', `npm ${result.stdout}`);
    return true;
  }
  print('FAIL', `无法执行 npm：${result.error || result.stderr || 'unknown error'}`);
  return false;
}

async function checkOllama() {
  if (!checkLocalEndpoint('Ollama', OLLAMA_HOST)) {
    return;
  }
  try {
    const result = await fetchJson(`${OLLAMA_HOST}/api/tags`);
    if (!result.ok) {
      print('WARN', `Ollama API 返回 HTTP ${result.status}: ${OLLAMA_HOST}`);
      printOllamaHint();
      return;
    }
    const models = Array.isArray(result.body.models) ? result.body.models : [];
    const found = models.some((model) => model.name === OLLAMA_MODEL || model.model === OLLAMA_MODEL);
    print('OK', `Ollama API 可访问: ${OLLAMA_HOST}`);
    if (found) {
      print('OK', `默认模型已安装: ${OLLAMA_MODEL}`);
    } else {
      print('WARN', `默认模型未安装: ${OLLAMA_MODEL}`);
      printOllamaHint();
    }
  } catch (error) {
    print('WARN', `无法访问 Ollama API: ${OLLAMA_HOST}`);
    print('INFO', `原因: ${error.message}`);
    printOllamaHint();
  }
}

async function checkComfyUI() {
  if (!checkLocalEndpoint('ComfyUI', COMFYUI_HOST)) {
    return;
  }
  try {
    const result = await fetchJson(`${COMFYUI_HOST}/system_stats`, 3000);
    if (result.ok) {
      print('OK', `ComfyUI API 可访问: ${COMFYUI_HOST}`);
      return;
    }
    print('WARN', `ComfyUI API 返回 HTTP ${result.status}: ${COMFYUI_HOST}`);
  } catch (error) {
    print('WARN', `无法访问 ComfyUI API: ${COMFYUI_HOST}`);
    print('INFO', `原因: ${error.message}`);
    print('INFO', '如需 day33 真实文生图，请先手动启动 ComfyUI；本项目不会自动安装或拉模型。');
  }
}

async function checkFramePack() {
  if (!checkLocalEndpoint('FramePack', FRAMEPACK_HOST)) {
    return;
  }
  try {
    const result = await fetchText(FRAMEPACK_HOST, 3000);
    if (result.ok) {
      print('OK', `FramePack/Gradio 入口可访问: ${FRAMEPACK_HOST}`);
      return;
    }
    print('WARN', `FramePack/Gradio 入口返回 HTTP ${result.status}: ${FRAMEPACK_HOST}`);
  } catch (error) {
    print('INFO', `FramePack 未启动或端口不可访问: ${FRAMEPACK_HOST}`);
    print('INFO', `原因: ${error.message}`);
  }
}

async function checkPython() {
  const candidates = process.platform === 'win32'
    ? [
        ['py', ['-3', '--version']],
        ['python', ['--version']],
      ]
    : [
        ['python3', ['--version']],
        ['python', ['--version']],
      ];
  for (const [command, args] of candidates) {
    const result = await run(command, args, 5000);
    const version = result.stdout || result.stderr;
    if (result.ok && version) {
      print('OK', `Python: ${version}`);
      return;
    }
  }
  print('WARN', '未找到可执行 Python；ComfyUI/FramePack 真实运行通常需要独立 Python 环境。');
}

function checkModelDirs() {
  const home = os.homedir();
  const dirs = [
    path.join(home, '.ollama', 'models'),
    path.join(home, 'ComfyUI', 'models'),
    path.join(home, 'FramePack', 'models'),
  ];
  for (const dir of dirs) {
    print(existsSync(dir) ? 'OK' : 'INFO', `模型目录${existsSync(dir) ? '存在' : '未发现'}: ${dir}`);
  }
}

function checkAppleSilicon() {
  if (process.platform === 'darwin' && process.arch === 'arm64') {
    print('INFO', 'Apple Silicon 建议：默认 qwen2.5:7b；图片/视频重负载实验可转到 Windows + RTX 5060 Ti 16G。');
  }
}

async function checkWindowsGpu() {
  if (process.platform !== 'win32') {
    print('INFO', 'GPU 检查跳过：当前不是 Windows；Win10 机器可运行 nvidia-smi 确认显卡。');
    return;
  }

  const result = await run('nvidia-smi', ['--query-gpu=name,memory.total', '--format=csv,noheader'], 8000);
  if (!result.ok || !result.stdout) {
    print('WARN', `无法执行 nvidia-smi：${result.error || result.stderr || 'unknown error'}`);
    print('INFO', '请确认已安装 NVIDIA 驱动，Ollama 才能使用 GPU 推理。');
    return;
  }

  print('OK', `NVIDIA GPU: ${result.stdout.replace(/\r?\n/g, ' | ')}`);
  const memoryMatches = [...result.stdout.matchAll(/(\d+)\s*MiB/gi)].map((match) => Number(match[1]));
  const has16gVram = memoryMatches.some((memory) => memory >= 15_000);
  if (/5060\s*ti/i.test(result.stdout) && has16gVram) {
    print('INFO', 'RTX 5060 Ti 16G 推荐：默认 qwen2.5:7b，进阶 qwen2.5-coder:14b。');
    print('INFO', '本地多模态建议：SDXL 默认学习，FLUX.1 schnell 进阶图片实验，FramePack/SVD 做短视频起步。');
  } else {
    print('INFO', '16G 显存机器可优先试 7B/14B 量化模型；不建议把 32B 作为默认模型。');
  }
}

console.log('mini-openclaw doctor');
console.log(`platform=${process.platform}`);
console.log(`ollama=${OLLAMA_HOST}`);
console.log(`comfyui=${COMFYUI_HOST}`);
console.log(`framepack=${FRAMEPACK_HOST}`);
console.log(`model=${OLLAMA_MODEL}`);

const hardChecks = [
  await checkNode(),
  await checkNpm(),
];
await checkOllama();
await checkPython();
checkModelDirs();
checkAppleSilicon();
await checkComfyUI();
await checkFramePack();
await checkWindowsGpu();

if (hardChecks.every(Boolean)) {
  print('OK', '本地 Node/npm 基础环境可用');
} else {
  process.exitCode = 1;
}
