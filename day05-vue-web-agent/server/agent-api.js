import { createServer } from 'node:http';

/**
 * Day 05：本地 Agent API。
 *
 * 这个服务把 Web UI 和 agent loop 隔开。它不引用其它 day 的源码；
 * mock 模式用于页面验证，真实模式只调用 OLLAMA_HOST 指向的本地模型。
 */
export const DEFAULT_OLLAMA_HOST = 'http://127.0.0.1:11434';
export const DEFAULT_MODEL = 'qwen2.5:7b';

/** 输出 JSON 响应，并设置本地开发需要的 CORS 头。 */
function jsonResponse(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  response.end(JSON.stringify(payload));
}

/** 读取 HTTP request body，并解析成 JSON 对象。 */
async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/** 调用 Ollama 生成一个最小回答，同时记录 Web UI 要展示的事件。 */
async function runLocalOllamaAgent(question, record) {
  const host = String(process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST).replace(/\/+$/, '');
  const model = process.env.OLLAMA_MODEL || DEFAULT_MODEL;
  const messages = [
    { role: 'system', content: '你是教学用 mini agent。请用中文简洁回答。' },
    { role: 'user', content: question },
  ];
  record({ type: 'model_request', step: 1, preview: `model=${model}` });
  const response = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false }),
  });
  if (!response.ok) {
    throw new Error(`Ollama 请求失败: HTTP ${response.status}`);
  }
  const data = await response.json();
  const answer = data?.message?.content;
  if (typeof answer !== 'string' || !answer.trim()) {
    throw new Error('Ollama 返回格式不符合预期');
  }
  record({ type: 'model_response', step: 1, preview: answer.slice(0, 180) });
  return answer.trim();
}

/** 执行一次 Agent API 请求。mock=true 时完全不依赖 Ollama。 */
export async function runAgentRequest({
  question,
  mock = process.env.AGENT_MOCK === '1',
  onEvent,
} = {}) {
  if (!question || typeof question !== 'string') {
    return { ok: false, error: 'question 不能为空' };
  }

  const events = [];
  const record = (event) => {
    events.push(event);
    if (typeof onEvent === 'function') {
      onEvent(event);
    }
  };

  if (mock) {
    record({ type: 'model_response', step: 1, preview: '{"type":"tool_call","tool":"calculator"}' });
    record({ type: 'tool_call', step: 1, tool: 'calculator' });
    record({ type: 'observation', step: 1, preview: '{"value":126}' });
    return {
      ok: true,
      answer: `mock 模式回答：已收到“${question}”，并演示了一次工具调用。`,
      events,
      mock: true,
      model: process.env.OLLAMA_MODEL || DEFAULT_MODEL,
      host: process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST,
    };
  }

  const answer = await runLocalOllamaAgent(question, record);
  return {
    ok: true,
    answer,
    events,
    mock: false,
    model: process.env.OLLAMA_MODEL || DEFAULT_MODEL,
    host: process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST,
  };
}

/** 创建本 day 自包含 HTTP server，暴露 /api/health 和 /api/agent。 */
export function createAgentHttpServer() {
  return createServer(async (request, response) => {
    try {
      if (request.method === 'OPTIONS') {
        jsonResponse(response, 204, {});
        return;
      }
      if (request.method === 'GET' && request.url === '/api/health') {
        jsonResponse(response, 200, {
          ok: true,
          mock: process.env.AGENT_MOCK === '1',
          model: process.env.OLLAMA_MODEL || DEFAULT_MODEL,
          host: process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST,
        });
        return;
      }
      if (request.method === 'POST' && request.url === '/api/agent') {
        const body = await readJson(request);
        const result = await runAgentRequest({
          question: body.question,
          mock: body.mock === true || process.env.AGENT_MOCK === '1',
        });
        jsonResponse(response, result.ok ? 200 : 400, result);
        return;
      }
      jsonResponse(response, 404, { ok: false, error: 'not found' });
    } catch (error) {
      jsonResponse(response, 500, { ok: false, error: error.message });
    }
  });
}
