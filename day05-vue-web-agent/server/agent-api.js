// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createServer } from 'node:http';

/**
 * Day 05：本地 Agent API。
 *
 * 这个服务把 Web UI 和 agent loop 隔开。它不引用其它 day 的源码；
 * mock 模式用于页面验证，真实模式只调用 OLLAMA_HOST 指向的本地模型。
 */
// 导出常量：其它文件可以 import 这个值，适合放默认配置或元信息。
export const DEFAULT_OLLAMA_HOST = 'http://127.0.0.1:11434';
// 导出常量：其它文件可以 import 这个值，适合放默认配置或元信息。
export const DEFAULT_MODEL = 'qwen2.5:7b';

/** 输出 JSON 响应，并设置本地开发需要的 CORS 头。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function jsonResponse(response, statusCode, payload) {
  // 处理 HTTP 响应对象：这里决定返回状态码、响应头或响应体。
  response.writeHead(statusCode, {
    // content-type 告诉浏览器：响应体是 UTF-8 JSON，前端可以直接 response.json()。
    'content-type': 'application/json; charset=utf-8',
    // 本地 Vite 前端和 Node API 端口不同，CORS 允许浏览器跨端口访问这个教学 API。
    'access-control-allow-origin': '*',
    // OPTIONS 是浏览器跨域预检请求；GET 用于 health，POST 用于提交 agent 问题。
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    // 允许前端发送 content-type: application/json 请求头。
    'access-control-allow-headers': 'content-type',
  });
  // 序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
  response.end(JSON.stringify(payload));
}

/** 读取 HTTP request body，并解析成 JSON 对象。 */
// 异步函数：里面会 await 异步操作，所以调用时也要等待结果。
async function readJson(request) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const chunks = [];
  // 异步循环：逐块读取异步数据流，常见于 HTTP 请求体。
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (chunks.length === 0) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return {};
  }
  // 解析 JSON：把字符串还原成 JS 对象，方便后续读取字段。
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/** 调用 Ollama 生成一个最小回答，同时记录 Web UI 要展示的事件。 */
// 异步函数：里面会 await 异步操作，所以调用时也要等待结果。
async function runLocalOllamaAgent(question, record) {
  // 读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
  const host = String(process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST).replace(/\/+$/, '');
  // 读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
  const model = process.env.OLLAMA_MODEL || DEFAULT_MODEL;
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const messages = [
    // system 消息是给模型看的规则，约束它用中文、简洁回答。
    { role: 'system', content: '你是教学用 mini agent。请用中文简洁回答。' },
    // user 消息是真正来自页面或 smoke 测试的问题。
    { role: 'user', content: question },
  ];
  record({ type: 'model_request', step: 1, preview: `model=${model}` });
  // /api/chat 是 Ollama 的聊天接口：这里让本地模型为 Web API 生成最终回答。
  // 发起 HTTP 请求：这里会访问本地 API 或 Ollama 服务。
  const response = await fetch(`${host}/api/chat`, {
    // POST 表示提交问题给模型生成答案。
    method: 'POST',
    // 告诉 Ollama 请求体是 JSON。
    headers: { 'content-type': 'application/json' },
    // body 是要发送给 Ollama 的参数对象；fetch 需要字符串，所以使用 JSON.stringify。
    // 序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
    body: JSON.stringify({
      // model 指定本地模型名，默认 qwen2.5:7b。
      model,
      // messages 是本轮对话上下文，包含 system 规则和用户问题。
      messages,
      // stream=false 表示关闭流式返回，后端等完整回答后再一次性返回给前端。
      stream: false,
      // 本 day 不设置 options.temperature，表示使用 Ollama 默认采样参数。
    }),
  });
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!response.ok) {
    // 抛出错误：让调用方知道当前流程不能继续。
    throw new Error(`Ollama 请求失败: HTTP ${response.status}`);
  }
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const data = await response.json();
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const answer = data?.message?.content;
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (typeof answer !== 'string' || !answer.trim()) {
    // 抛出错误：让调用方知道当前流程不能继续。
    throw new Error('Ollama 返回格式不符合预期');
  }
  record({ type: 'model_response', step: 1, preview: answer.slice(0, 180) });
  // 返回结果：调用方会拿到这个值继续后续流程。
  return answer.trim();
}

/** 执行一次 Agent API 请求。mock=true 时完全不依赖 Ollama。 */
// 导出异步函数：调用方需要 await 它，因为内部可能读文件、请求接口或等待模型。
export async function runAgentRequest({
  question,
  // 读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
  mock = process.env.AGENT_MOCK === '1',
  onEvent,
} = {}) {
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!question || typeof question !== 'string') {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return { ok: false, error: 'question 不能为空' };
  }

  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const events = [];
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const record = (event) => {
    events.push(event);
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (typeof onEvent === 'function') {
      onEvent(event);
    }
  };

  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (mock) {
    record({ type: 'model_response', step: 1, preview: '{"type":"tool_call","tool":"calculator"}' });
    record({ type: 'tool_call', step: 1, tool: 'calculator' });
    record({ type: 'observation', step: 1, preview: '{"value":126}' });
    // 返回结果：调用方会拿到这个值继续后续流程。
    return {
      ok: true,
      answer: `mock 模式回答：已收到“${question}”，并演示了一次工具调用。`,
      events,
      steps: events,
      mock: true,
      // 读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
      model: process.env.OLLAMA_MODEL || DEFAULT_MODEL,
      // 读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
      host: process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST,
    };
  }

  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const answer = await runLocalOllamaAgent(question, record);
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    ok: true,
    answer,
    events,
    steps: events,
    mock: false,
    // 读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
    model: process.env.OLLAMA_MODEL || DEFAULT_MODEL,
    // 读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
    host: process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST,
  };
}

/** 创建本 day 自包含 HTTP server，暴露 /api/health 和 /api/agent。 */
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createAgentHttpServer() {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return createServer(async (request, response) => {
    // try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
    try {
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (request.method === 'OPTIONS') {
        jsonResponse(response, 204, {});
        // 返回结果：调用方会拿到这个值继续后续流程。
        return;
      }
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (request.method === 'GET' && request.url === '/api/health') {
        jsonResponse(response, 200, {
          ok: true,
          // 读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
          mock: process.env.AGENT_MOCK === '1',
          // 读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
          model: process.env.OLLAMA_MODEL || DEFAULT_MODEL,
          // 读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
          host: process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST,
        });
        // 返回结果：调用方会拿到这个值继续后续流程。
        return;
      }
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (request.method === 'POST' && request.url === '/api/agent') {
        // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
        const body = await readJson(request);
        // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
        const result = await runAgentRequest({
          // question 是前端传来的用户问题，后端会把它放进 Ollama 的 user message。
          question: body.question,
          // mock=true 表示只演示工具调用事件，不访问 Ollama；适合前端页面和单元测试。
          // 读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
          mock: body.mock === true || process.env.AGENT_MOCK === '1',
        });
        jsonResponse(response, result.ok ? 200 : 400, result);
        // 返回结果：调用方会拿到这个值继续后续流程。
        return;
      }
      jsonResponse(response, 404, { ok: false, error: 'not found' });
    } catch (error) {
      jsonResponse(response, 500, { ok: false, error: error.message });
    }
  });
}
