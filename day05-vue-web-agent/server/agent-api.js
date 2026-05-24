import { createServer } from 'node:http';

import { runAgent } from '../../day01-single-agent-cli/src/agent.js';
import { DEFAULT_MODEL, DEFAULT_OLLAMA_HOST } from '../../day01-single-agent-cli/src/ollama-client.js';

function jsonResponse(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  response.end(JSON.stringify(payload));
}

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

  const answer = await runAgent({
    question,
    onStep: record,
  });
  return {
    ok: true,
    answer,
    events,
    mock: false,
    model: process.env.OLLAMA_MODEL || DEFAULT_MODEL,
    host: process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST,
  };
}

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

