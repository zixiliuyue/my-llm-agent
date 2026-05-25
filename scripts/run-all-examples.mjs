#!/usr/bin/env node
/**
 * 一键 smoke runner。
 *
 * 这个脚本用于把 55 天示例按固定顺序跑一遍。它只做本地验证：
 * 真实模型调用只访问 OLLAMA_HOST，远程部署、Docker 和危险命令都不执行。
 */
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { spawn } from 'node:child_process';
// 教学：删除目录：这里只清理本地构建产物 dist，不删除源码。
import { readdirSync, rmSync } from 'node:fs';
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createServer } from 'node:net';
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { delimiter, dirname, resolve } from 'node:path';
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { fileURLToPath } from 'node:url';

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const __dirname = dirname(fileURLToPath(import.meta.url));
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const REPO_ROOT = resolve(__dirname, '..');
// 教学：读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
// 教学：读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b';
// Windows 环境变量名常见是 Path，macOS/Linux 是 PATH；保留原名能避免覆盖失败。
const PATH_KEY = Object.keys(process.env).find((key) => key.toLowerCase() === 'path') || 'PATH';
// Windows 下 npm 可执行文件是 npm.cmd，直接 spawn npm 会找不到入口。
const NPM_COMMAND = process.platform === 'win32' ? 'npm.cmd' : 'npm';
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const BASE_ENV = {
  ...process.env,
  // 教学：读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
  [PATH_KEY]: [dirname(process.execPath), process.env[PATH_KEY] || ''].filter(Boolean).join(delimiter),
  OLLAMA_HOST,
  OLLAMA_MODEL,
  // 教学：读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
  NO_COLOR: process.env.NO_COLOR || '1',
};

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const WEB_BUILD_SCRIPTS = ['day05:build', 'day14:build', 'day15:build', 'day28:build', 'day30:build', 'day34:build'];
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const DIST_DIRS = [
  'day05-vue-web-agent/frontend/dist',
  'day14-event-stream-ui/dist',
  'day15-webchat-session/dist',
  'day28-observability-dashboard/dist',
  'day30-mini-openclaw-integrated/dist',
  'day34-image-job-queue-ui/dist',
];

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const START_ARGS = new Map([
  ['day01:start', ['计算 (18+24)*3，只输出最终答案。']],
  ['day02:start', ['计算 (18+24)*3，只输出最终答案。']],
  ['day03:start', ['什么是 agent loop']],
  ['day35:start', ['一个 Windows 5060 Ti 工作站正在跑本地图片模型']],
]);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const LONG_TIMEOUT_MS = 240_000;
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const SHORT_TIMEOUT_MS = 30_000;

/** 截取命令输出尾部，失败时保留最有定位价值的部分。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function tail(text, max = 1600) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const value = String(text || '').trim();
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return value.length > max ? value.slice(-max) : value;
}

/** 把命令参数格式化成人可复制的形式。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function formatCommand(command, args) {
  // 教学：序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
  return [command, ...args].map((part) => (/\s/.test(part) ? JSON.stringify(part) : part)).join(' ');
}

/** 终止子进程；macOS 下优先终止进程组，避免 npm 子进程残留。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function terminate(child) {
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  // 教学：try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
  try {
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (process.platform !== 'win32' && child.pid) {
      process.kill(-child.pid, 'SIGTERM');
    } else {
      // 教学：监听子进程事件：用于收集命令输出、错误和退出状态。
      child.kill('SIGTERM');
    }
  } catch {
    // 进程可能已经退出；这里不把清理失败覆盖原始错误。
  }
}

/** 执行一个短生命周期命令，并捕获 stdout/stderr 供失败摘要使用。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function runCommand({
  label,
  command = NPM_COMMAND,
  args,
  timeoutMs = SHORT_TIMEOUT_MS,
  env = {},
}) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return new Promise((resolve) => {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const startedAt = Date.now();
    // 教学：启动子进程：smoke runner 用它执行 npm 脚本并捕获输出。
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      env: { ...BASE_ENV, ...env },
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    // 教学：定义变量：这个值后面会被更新，所以使用 let。
    let stdout = '';
    // 教学：定义变量：这个值后面会被更新，所以使用 let。
    let stderr = '';
    // 教学：定义变量：这个值后面会被更新，所以使用 let。
    let timedOut = false;
    // 教学：设置超时：防止网络请求或子进程无限等待。
    const timer = setTimeout(() => {
      timedOut = true;
      terminate(child);
    }, timeoutMs);

    // 教学：监听子进程事件：用于收集命令输出、错误和退出状态。
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    // 教学：监听子进程事件：用于收集命令输出、错误和退出状态。
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    // 教学：监听子进程事件：用于收集命令输出、错误和退出状态。
    child.on('error', (error) => {
      // 教学：清理超时计时器：请求结束后避免定时器继续占用资源。
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
    // 教学：监听子进程事件：用于收集命令输出、错误和退出状态。
    child.on('close', (code, signal) => {
      // 教学：清理超时计时器：请求结束后避免定时器继续占用资源。
      clearTimeout(timer);
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
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

/**
 * 用 fetch 调用 JSON API，并给网络请求加 timeout。
 *
 * url 是接口地址；options 是 method、headers、body 等 fetch 参数；
 * timeoutMs 是最长等待时间，超过后用 AbortController 取消请求。
 */
// 教学：异步函数：里面会 await 异步操作，所以调用时也要等待结果。
async function fetchJson(url, options = {}, timeoutMs = SHORT_TIMEOUT_MS) {
  // 教学：创建取消控制器：后面把 signal 传给 fetch，实现超时取消。
  const controller = new AbortController();
  // AbortController 是浏览器和 Node fetch 的取消机制；这里用它防止 smoke 卡死。
  // 教学：设置超时：防止网络请求或子进程无限等待。
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // 教学：try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
  try {
    // signal 把本次 fetch 和 AbortController 绑定，计时器触发时请求会被中断。
    // 教学：发起 HTTP 请求：这里会访问本地 API 或 Ollama 服务。
    const response = await fetch(url, { ...options, signal: controller.signal });
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const text = await response.text();
    // 教学：定义变量：这个值后面会被更新，所以使用 let。
    let body;
    // 教学：try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
    try {
      // 教学：解析 JSON：把字符串还原成 JS 对象，方便后续读取字段。
      body = text ? JSON.parse(text) : {};
    } catch {
      // 教学：抛出错误：让调用方知道当前流程不能继续。
      throw new Error(`响应不是 JSON: ${text.slice(0, 200)}`);
    }
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!response.ok) {
      // 教学：序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(body).slice(0, 300)}`);
    }
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return body;
  } finally {
    // 教学：清理超时计时器：请求结束后避免定时器继续占用资源。
    clearTimeout(timer);
  }
}

/** 找一个空闲本地端口，避免和用户正在运行的 day05 服务冲突。 */
// 教学：异步函数：里面会 await 异步操作，所以调用时也要等待结果。
async function getFreePort() {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const server = createServer();
  // 教学：等待异步操作完成：下一行代码依赖这个结果。
  await new Promise((resolve, reject) => {
    // 教学：操作本地 server：测试或 smoke 会临时启动服务再关闭。
    server.once('error', reject);
    // 教学：操作本地 server：测试或 smoke 会临时启动服务再关闭。
    server.listen(0, '127.0.0.1', resolve);
  });
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const { port } = server.address();
  // 教学：等待异步操作完成：下一行代码依赖这个结果。
  await new Promise((resolve) => server.close(resolve));
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return port;
}

/** 检查本地 Ollama 是否可用，并确认默认模型已经拉取。 */
// 教学：异步函数：里面会 await 异步操作，所以调用时也要等待结果。
async function checkOllama() {
  // /api/tags 是 Ollama 的模型列表接口；如果这里失败，说明 Ollama 没启动或地址不对。
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const tags = await fetchJson(`${OLLAMA_HOST}/api/tags`, {}, SHORT_TIMEOUT_MS);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const models = Array.isArray(tags.models) ? tags.models : [];
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!models.some((model) => model.name === OLLAMA_MODEL || model.model === OLLAMA_MODEL)) {
    // 教学：抛出错误：让调用方知道当前流程不能继续。
    throw new Error(`Ollama 未找到模型 ${OLLAMA_MODEL}`);
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return `${OLLAMA_HOST} has ${OLLAMA_MODEL}`;
}

/** 递归收集本仓库教学源码里的 JS 文件，跳过依赖、构建产物和 Git 目录。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function collectJavaScriptFiles(dir = REPO_ROOT) {
  // 教学：读取目录：用于扫描本仓库的 day 目录或源码文件。
  const entries = readdirSync(dir, { withFileTypes: true });
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const files = [];
  // 教学：循环：按顺序处理多条数据或多个步骤。
  for (const entry of entries) {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const fullPath = resolve(dir, entry.name);
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const relativePath = fullPath.slice(REPO_ROOT.length + 1);
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (entry.isDirectory()) {
      // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (['.git', 'node_modules', 'dist'].includes(entry.name)) continue;
      files.push(...collectJavaScriptFiles(fullPath));
      continue;
    }
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (entry.isFile() && /\.(?:mjs|js)$/.test(entry.name)) {
      files.push(relativePath);
    }
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return files.sort();
}

/** 检查所有 JS 入口语法，专门防止 shebang 位置错误再次出现。 */
// 教学：异步函数：里面会 await 异步操作，所以调用时也要等待结果。
async function runSyntaxCheck() {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const files = collectJavaScriptFiles();

  // 教学：循环：按顺序处理多条数据或多个步骤。
  for (const file of files) {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const result = await runCommand({
      label: `syntax ${file}`,
      command: process.execPath,
      args: ['--check', file],
      timeoutMs: SHORT_TIMEOUT_MS,
    });
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!result.ok) {
      // 教学：抛出错误：让调用方知道当前流程不能继续。
      throw new Error(`${file} 语法检查失败\n${tail(result.stderr || result.stdout)}`);
    }
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return `${files.length} files checked`;
}

/** 运行 npm script，并按真实模型或 mock 示例选择 timeout。 */
// 教学：异步函数：里面会 await 异步操作，所以调用时也要等待结果。
async function runNpmScript(script, args = [], timeoutMs = SHORT_TIMEOUT_MS) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return runCommand({
    label: script,
    args: ['run', script, ...(args.length > 0 ? ['--', ...args] : [])],
    timeoutMs,
  });
}

/** 启动 day05 API server，发起一次真实模型请求，再关闭 server。 */
// 教学：异步函数：里面会 await 异步操作，所以调用时也要等待结果。
async function runDay05ApiSmoke() {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const port = await getFreePort();
  // 教学：启动子进程：smoke runner 用它执行 npm 脚本并捕获输出。
  const child = spawn(NPM_COMMAND, ['run', 'day05:start'], {
    cwd: REPO_ROOT,
    env: { ...BASE_ENV, AGENT_PORT: String(port), AGENT_MOCK: '' },
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // 教学：定义变量：这个值后面会被更新，所以使用 let。
  let stdout = '';
  // 教学：定义变量：这个值后面会被更新，所以使用 let。
  let stderr = '';
  // 教学：监听子进程事件：用于收集命令输出、错误和退出状态。
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  // 教学：监听子进程事件：用于收集命令输出、错误和退出状态。
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const startedAt = Date.now();
  // 教学：try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
  try {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const deadline = Date.now() + 30_000;
    // 教学：while 循环：只要条件成立就继续处理，适合解析或轮询。
    while (Date.now() < deadline) {
      // 教学：try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
      try {
        // 教学：等待异步操作完成：下一行代码依赖这个结果。
        await fetchJson(`http://127.0.0.1:${port}/api/health`, {}, 2000);
        break;
      } catch {
        // 教学：设置超时：防止网络请求或子进程无限等待。
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
    // 教学：等待异步操作完成：下一行代码依赖这个结果。
    await fetchJson(`http://127.0.0.1:${port}/api/health`, {}, 2000);
    // 这里调用 day05 的本地 /api/agent，验证“前端提交问题 -> 后端调用真实 Ollama -> 返回步骤和答案”。
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const body = await fetchJson(`http://127.0.0.1:${port}/api/agent`, {
      // POST 表示提交一个真实问题给 agent API。
      method: 'POST',
      // 告诉 day05 后端 body 是 JSON，readJson 会按 JSON 解析。
      headers: { 'content-type': 'application/json' },
      // question 是 smoke 测试的问题；不传 mock，所以会走真实 Ollama。
      // 教学：序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
      body: JSON.stringify({
        question: '用一句话解释 agent loop。',
      }),
    }, LONG_TIMEOUT_MS);
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (body.ok !== true || typeof body.answer !== 'string' || !body.answer.trim()) {
      // 教学：序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
      throw new Error(`day05 API 没有返回有效 answer: ${JSON.stringify(body).slice(0, 300)}`);
    }
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!Array.isArray(body.steps) || body.steps.length === 0) {
      // 教学：序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
      throw new Error(`day05 API 没有返回非空 steps: ${JSON.stringify(body).slice(0, 300)}`);
    }
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return {
      label: 'day05:start/api',
      ok: true,
      command: 'npm run day05:start + POST /api/agent',
      ms: Date.now() - startedAt,
      stdout,
      stderr,
    };
  } catch (error) {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
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
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function cleanupDist() {
  // 教学：循环：按顺序处理多条数据或多个步骤。
  for (const dir of DIST_DIRS) {
    // 教学：删除目录：这里只清理本地构建产物 dist，不删除源码。
    rmSync(resolve(REPO_ROOT, dir), { recursive: true, force: true });
  }
}

/** 打印每个步骤的压缩结果表。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function printSummary(results) {
  // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
  console.error('\nSmoke summary');
  // 教学：循环：按顺序处理多条数据或多个步骤。
  for (const result of results) {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const status = result.ok ? 'OK ' : 'FAIL';
    // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
    console.error(`${status} ${String(result.ms).padStart(6)}ms  ${result.label}`);
  }
}

/** 记录一个步骤，失败时保留命令和输出摘要。 */
// 教学：异步函数：里面会 await 异步操作，所以调用时也要等待结果。
async function runStep(results, label, fn) {
  // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
  console.error(`\n▶ ${label}`);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const startedAt = Date.now();
  // 教学：try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
  try {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const value = await fn();
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const result = typeof value === 'object' && value && 'ok' in value
      ? value
      : { label, ok: true, command: label, ms: Date.now() - startedAt, stdout: String(value || '') };
    results.push({ ...result, label });
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!result.ok) {
      // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
      console.error(`FAIL ${label}`);
      // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
      console.error(`command: ${result.command}`);
      // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (result.error) console.error(`error: ${result.error}`);
      // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (result.stderr) console.error(`stderr:\n${tail(result.stderr)}`);
      // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (result.stdout) console.error(`stdout:\n${tail(result.stdout)}`);
    } else {
      // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
      console.error(`OK ${label}`);
    }
  } catch (error) {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
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
    // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
    console.error(`FAIL ${label}`);
    // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
    console.error(`error: ${error.message}`);
  }
}

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const results = [];
// 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
console.error(`node=${process.version}`);
// 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
console.error(`nodePath=${process.execPath}`);
// 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
console.error(`ollama=${OLLAMA_HOST}`);
// 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
console.error(`model=${OLLAMA_MODEL}`);

// 教学：等待异步操作完成：下一行代码依赖这个结果。
await runStep(results, 'ollama:tags', checkOllama);
// 教学：等待异步操作完成：下一行代码依赖这个结果。
await runStep(results, 'syntax:cli', runSyntaxCheck);
// 教学：等待异步操作完成：下一行代码依赖这个结果。
await runStep(results, 'npm:test', () => runNpmScript('test', [], LONG_TIMEOUT_MS));
// 根级综合练习：串起 day35/day33/day34/day36/day38/day39/day40，但只走 mock。
await runStep(results, 'local:multimodal', () => runNpmScript('local:multimodal', ['一个本地 agent 平台封面图'], SHORT_TIMEOUT_MS));

// 教学：循环：按顺序处理多条数据或多个步骤。
for (let day = 1; day <= 55; day += 1) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const script = `day${String(day).padStart(2, '0')}:start`;
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (script === 'day05:start') {
    // 教学：等待异步操作完成：下一行代码依赖这个结果。
    await runStep(results, script, runDay05ApiSmoke);
    continue;
  }
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const timeoutMs = day <= 2 ? LONG_TIMEOUT_MS : SHORT_TIMEOUT_MS;
  // 教学：等待异步操作完成：下一行代码依赖这个结果。
  await runStep(results, script, () => runNpmScript(script, START_ARGS.get(script) || [], timeoutMs));
}

// 教学：循环：按顺序处理多条数据或多个步骤。
for (const script of WEB_BUILD_SCRIPTS) {
  // 教学：等待异步操作完成：下一行代码依赖这个结果。
  await runStep(results, script, () => runNpmScript(script, [], LONG_TIMEOUT_MS));
}

cleanupDist();
printSummary(results);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const failed = results.filter((result) => !result.ok);
// 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
if (failed.length > 0) {
  // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
  console.error(`\n${failed.length} step(s) failed.`);
  // 教学：退出进程：用退出码告诉 shell 当前命令成功还是失败。
  process.exitCode = 1;
} else {
  // 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
  console.log('examples smoke passed');
}
