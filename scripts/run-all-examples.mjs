#!/usr/bin/env node
/**
 * 一键 smoke runner。
 *
 * 这个脚本用于把 30 天示例按固定顺序跑一遍。它只做本地验证：
 * 真实模型调用只访问 OLLAMA_HOST，远程部署、Docker 和危险命令都不执行。
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const NODE22_BIN = '/Users/hongsen.ren/.nvm/versions/node/v22.21.1/bin';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b';
const BASE_ENV = {
  ...process.env,
  PATH: `${dirname(process.execPath)}:${NODE22_BIN}:${process.env.PATH || ''}`,
  OLLAMA_HOST,
  OLLAMA_MODEL,
  NO_COLOR: process.env.NO_COLOR || '1',
};

const WEB_BUILD_SCRIPTS = ['day05:build', 'day14:build', 'day15:build', 'day28:build', 'day30:build'];
const DIST_DIRS = [
  'day05-vue-web-agent/frontend/dist',
  'day14-event-stream-ui/dist',
  'day15-webchat-session/dist',
  'day28-observability-dashboard/dist',
  'day30-mini-openclaw-integrated/dist',
];

const START_ARGS = new Map([
  ['day01:start', ['计算 (18+24)*3，只输出最终答案。']],
  ['day02:start', ['计算 (18+24)*3，只输出最终答案。']],
  ['day03:start', ['什么是 agent loop']],
]);

const LONG_TIMEOUT_MS = 240_000;
const SHORT_TIMEOUT_MS = 30_000;

/** 截取命令输出尾部，失败时保留最有定位价值的部分。 */
function tail(text, max = 1600) {
  const value = String(text || '').trim();
  return value.length > max ? value.slice(-max) : value;
}

/** 把命令参数格式化成人可复制的形式。 */
function formatCommand(command, args) {
  return [command, ...args].map((part) => (/\s/.test(part) ? JSON.stringify(part) : part)).join(' ');
}

/** 终止子进程；macOS 下优先终止进程组，避免 npm 子进程残留。 */
function terminate(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  try {
    if (process.platform !== 'win32' && child.pid) {
      process.kill(-child.pid, 'SIGTERM');
    } else {
      child.kill('SIGTERM');
    }
  } catch {
    // 进程可能已经退出；这里不把清理失败覆盖原始错误。
  }
}

/** 执行一个短生命周期命令，并捕获 stdout/stderr 供失败摘要使用。 */
function runCommand({
  label,
  command = 'npm',
  args,
  timeoutMs = SHORT_TIMEOUT_MS,
  env = {},
}) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      env: { ...BASE_ENV, ...env },
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      terminate(child);
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({
        label,
        ok: false,
        command: formatCommand(command, args),
        ms: Date.now() - startedAt,
        error: error.message,
        stdout,
        stderr,
      });
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const ok = code === 0 && !timedOut;
      resolve({
        label,
        ok,
        command: formatCommand(command, args),
        ms: Date.now() - startedAt,
        code,
        signal,
        timedOut,
        stdout,
        stderr,
        error: timedOut ? `命令超过 ${timeoutMs}ms 未结束` : undefined,
      });
    });
  });
}

/** 用 fetch 调用 JSON API，并给网络请求加 timeout。 */
async function fetchJson(url, options = {}, timeoutMs = SHORT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`响应不是 JSON: ${text.slice(0, 200)}`);
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(body).slice(0, 300)}`);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

/** 找一个空闲本地端口，避免和用户正在运行的 day05 服务冲突。 */
async function getFreePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

/** 检查本地 Ollama 是否可用，并确认默认模型已经拉取。 */
async function checkOllama() {
  const tags = await fetchJson(`${OLLAMA_HOST}/api/tags`, {}, SHORT_TIMEOUT_MS);
  const models = Array.isArray(tags.models) ? tags.models : [];
  if (!models.some((model) => model.name === OLLAMA_MODEL || model.model === OLLAMA_MODEL)) {
    throw new Error(`Ollama 未找到模型 ${OLLAMA_MODEL}`);
  }
  return `${OLLAMA_HOST} has ${OLLAMA_MODEL}`;
}

/** 检查所有 CLI 入口语法，专门防止 shebang 位置错误再次出现。 */
async function runSyntaxCheck() {
  const files = readdirSync(REPO_ROOT)
    .filter((name) => /^day\d{2}-/.test(name))
    .map((name) => `${name}/src/cli.js`)
    .filter((file) => existsSync(resolve(REPO_ROOT, file)));
  files.push('day05-vue-web-agent/server/index.js');

  for (const file of files) {
    const result = await runCommand({
      label: `syntax ${file}`,
      command: process.execPath,
      args: ['--check', file],
      timeoutMs: SHORT_TIMEOUT_MS,
    });
    if (!result.ok) {
      throw new Error(`${file} 语法检查失败\n${tail(result.stderr || result.stdout)}`);
    }
  }
  return `${files.length} files checked`;
}

/** 运行 npm script，并按真实模型或 mock 示例选择 timeout。 */
async function runNpmScript(script, args = [], timeoutMs = SHORT_TIMEOUT_MS) {
  return runCommand({
    label: script,
    args: ['run', script, ...(args.length > 0 ? ['--', ...args] : [])],
    timeoutMs,
  });
}

/** 启动 day05 API server，发起一次真实模型请求，再关闭 server。 */
async function runDay05ApiSmoke() {
  const port = await getFreePort();
  const child = spawn('npm', ['run', 'day05:start'], {
    cwd: REPO_ROOT,
    env: { ...BASE_ENV, AGENT_PORT: String(port), AGENT_MOCK: '' },
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  const startedAt = Date.now();
  try {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      try {
        await fetchJson(`http://127.0.0.1:${port}/api/health`, {}, 2000);
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
    await fetchJson(`http://127.0.0.1:${port}/api/health`, {}, 2000);
    const body = await fetchJson(`http://127.0.0.1:${port}/api/agent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: '用一句话解释 agent loop。' }),
    }, LONG_TIMEOUT_MS);
    if (body.ok !== true || typeof body.answer !== 'string' || !body.answer.trim()) {
      throw new Error(`day05 API 没有返回有效 answer: ${JSON.stringify(body).slice(0, 300)}`);
    }
    if (!Array.isArray(body.steps) || body.steps.length === 0) {
      throw new Error(`day05 API 没有返回非空 steps: ${JSON.stringify(body).slice(0, 300)}`);
    }
    return {
      label: 'day05:start/api',
      ok: true,
      command: 'npm run day05:start + POST /api/agent',
      ms: Date.now() - startedAt,
      stdout,
      stderr,
    };
  } catch (error) {
    return {
      label: 'day05:start/api',
      ok: false,
      command: 'npm run day05:start + POST /api/agent',
      ms: Date.now() - startedAt,
      error: error.message,
      stdout,
      stderr,
    };
  } finally {
    terminate(child);
  }
}

/** 清理 Web build 产物，保持仓库不会残留 dist。 */
function cleanupDist() {
  for (const dir of DIST_DIRS) {
    rmSync(resolve(REPO_ROOT, dir), { recursive: true, force: true });
  }
}

/** 打印每个步骤的压缩结果表。 */
function printSummary(results) {
  console.error('\nSmoke summary');
  for (const result of results) {
    const status = result.ok ? 'OK ' : 'FAIL';
    console.error(`${status} ${String(result.ms).padStart(6)}ms  ${result.label}`);
  }
}

/** 记录一个步骤，失败时保留命令和输出摘要。 */
async function runStep(results, label, fn) {
  console.error(`\n▶ ${label}`);
  const startedAt = Date.now();
  try {
    const value = await fn();
    const result = typeof value === 'object' && value && 'ok' in value
      ? value
      : { label, ok: true, command: label, ms: Date.now() - startedAt, stdout: String(value || '') };
    results.push({ ...result, label });
    if (!result.ok) {
      console.error(`FAIL ${label}`);
      console.error(`command: ${result.command}`);
      if (result.error) console.error(`error: ${result.error}`);
      if (result.stderr) console.error(`stderr:\n${tail(result.stderr)}`);
      if (result.stdout) console.error(`stdout:\n${tail(result.stdout)}`);
    } else {
      console.error(`OK ${label}`);
    }
  } catch (error) {
    const result = {
      label,
      ok: false,
      command: label,
      ms: Date.now() - startedAt,
      error: error.message,
      stdout: '',
      stderr: '',
    };
    results.push(result);
    console.error(`FAIL ${label}`);
    console.error(`error: ${error.message}`);
  }
}

const results = [];
console.error(`node=${process.version}`);
console.error(`nodePath=${process.execPath}`);
console.error(`ollama=${OLLAMA_HOST}`);
console.error(`model=${OLLAMA_MODEL}`);

await runStep(results, 'ollama:tags', checkOllama);
await runStep(results, 'syntax:cli', runSyntaxCheck);
await runStep(results, 'npm:test', () => runNpmScript('test', [], LONG_TIMEOUT_MS));

for (let day = 1; day <= 30; day += 1) {
  const script = `day${String(day).padStart(2, '0')}:start`;
  if (script === 'day05:start') {
    await runStep(results, script, runDay05ApiSmoke);
    continue;
  }
  const timeoutMs = day <= 2 ? LONG_TIMEOUT_MS : SHORT_TIMEOUT_MS;
  await runStep(results, script, () => runNpmScript(script, START_ARGS.get(script) || [], timeoutMs));
}

for (const script of WEB_BUILD_SCRIPTS) {
  await runStep(results, script, () => runNpmScript(script, [], LONG_TIMEOUT_MS));
}

cleanupDist();
printSummary(results);

const failed = results.filter((result) => !result.ok);
if (failed.length > 0) {
  console.error(`\n${failed.length} step(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('examples smoke passed');
}
