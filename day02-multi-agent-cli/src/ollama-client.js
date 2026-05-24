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
      // /api/chat 是 Ollama 的聊天接口：planner、critic、writer 都通过它让本地模型生成文本。
      const response = await fetchImpl(`${baseUrl}/api/chat`, {
        // POST 用来提交本轮多 agent 的上下文和角色提示词。
        method: 'POST',
        // 明确告诉 Ollama body 是 JSON 格式。
        headers: { 'content-type': 'application/json' },
        // fetch body 只能传字符串；这里把教学用请求对象转成 JSON 字符串。
        body: JSON.stringify({
          // model 选择本地运行的模型，默认 qwen2.5:7b。
          model,
          // messages 包含当前 agent 角色的 system prompt 和本轮输入 payload。
          messages,
          // stream=false 让 Ollama 一次性返回完整文本，方便 parsePlan/parseFinal 解析 JSON。
          stream: false,
          options: {
            // 低 temperature 会减少随机性，适合多 agent 之间传递结构化 JSON。
            temperature: 0.1,
          },
        }),
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
