/**
 * Day 1：自包含学习源码。
 *
 * 这个文件属于 day01-single-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
export const DEFAULT_OLLAMA_HOST = 'http://127.0.0.1:11434';
export const DEFAULT_MODEL = 'qwen2.5:7b';

/** 规范化 Ollama 地址，避免结尾斜杠影响 API 拼接。 */
function normalizeHost(host) {
  return String(host || DEFAULT_OLLAMA_HOST).replace(/\/+$/, '');
}

/** 把 Ollama 连接失败转换成更容易理解的中文提示。 */
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

/** 创建 Ollama chat 客户端，所有真实模型调用都走这里。 */
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

/** 读取 Ollama 本地模型列表，供环境检查使用。 */
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
