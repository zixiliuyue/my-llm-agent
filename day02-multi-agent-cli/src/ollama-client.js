/**
 * Day 02：本地 Ollama client。
 *
 * 这个文件复制了 day02 所需的最小模型调用能力，避免跨 day import。
 */
export const DEFAULT_OLLAMA_HOST = 'http://127.0.0.1:11434';
export const DEFAULT_MODEL = 'qwen2.5:7b';

/** 去掉 host 末尾的斜杠，避免拼接 URL 时出现双斜杠。 */
function normalizeHost(host) {
  return String(host || DEFAULT_OLLAMA_HOST).replace(/\/+$/, '');
}

/** 创建一个只包含 chat 方法的最小 Ollama client。 */
export function createOllamaClient({
  host = process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST,
  model = process.env.OLLAMA_MODEL || DEFAULT_MODEL,
  fetchImpl = globalThis.fetch,
} = {}) {
  const baseUrl = normalizeHost(host);
  return {
    host: baseUrl,
    model,
    /** 调用 Ollama /api/chat，返回模型文本内容。 */
    async chat(messages) {
      const response = await fetchImpl(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: false, options: { temperature: 0.1 } }),
      });
      if (!response.ok) {
        throw new Error(`Ollama 请求失败: HTTP ${response.status}`);
      }
      const data = await response.json();
      const content = data?.message?.content;
      if (typeof content !== 'string' || !content.trim()) {
        throw new Error('Ollama 返回格式不符合预期');
      }
      return content;
    },
  };
}

