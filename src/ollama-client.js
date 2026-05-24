export const DEFAULT_OLLAMA_HOST = 'http://127.0.0.1:11434';
export const DEFAULT_MODEL = 'qwen2.5:7b';

function normalizeHost(host) {
  return String(host || DEFAULT_OLLAMA_HOST).replace(/\/+$/, '');
}

function friendlyConnectionError(host, error) {
  return new Error([
    `无法连接 Ollama: ${host}`,
    `原始错误: ${error.message}`,
    '',
    '请先确认：',
    '1. 已安装 Ollama: https://ollama.com/download',
    '2. 已启动服务: ollama serve',
    `3. 已拉取模型: ollama pull ${process.env.OLLAMA_MODEL || DEFAULT_MODEL}`,
  ].join('\n'));
}

export function createOllamaClient({
  host = process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST,
  model = process.env.OLLAMA_MODEL || DEFAULT_MODEL,
  fetchImpl = globalThis.fetch,
} = {}) {
  const baseUrl = normalizeHost(host);
  if (typeof fetchImpl !== 'function') {
    throw new Error('当前 Node 版本缺少 fetch，请使用 Node 18.17 或更高版本');
  }

  return {
    host: baseUrl,
    model,
    async chat(messages) {
      let response;
      try {
        response = await fetchImpl(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            model,
            messages,
            stream: false,
            options: {
              temperature: 0.1,
            },
          }),
        });
      } catch (error) {
        throw friendlyConnectionError(baseUrl, error);
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Ollama 请求失败: HTTP ${response.status}\n${body}`);
      }

      const data = await response.json();
      const content = data?.message?.content;
      if (!content || typeof content !== 'string') {
        throw new Error(`Ollama 返回格式不符合预期: ${JSON.stringify(data)}`);
      }
      return content;
    },
  };
}

export async function listOllamaModels({
  host = process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST,
  fetchImpl = globalThis.fetch,
  timeoutMs = 3000,
} = {}) {
  const baseUrl = normalizeHost(host);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${baseUrl}/api/tags`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        ok: false,
        error: `HTTP ${response.status}`,
        models: [],
      };
    }
    const data = await response.json();
    return {
      ok: true,
      models: Array.isArray(data.models) ? data.models.map((item) => item.name).filter(Boolean) : [],
    };
  } catch (error) {
    return {
      ok: false,
      error: error.name === 'AbortError' ? `连接超时 ${timeoutMs}ms` : error.message,
      models: [],
    };
  } finally {
    clearTimeout(timer);
  }
}
