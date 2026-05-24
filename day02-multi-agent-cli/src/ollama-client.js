/**
 * Day 02：本地 Ollama client。
 *
 * 这个文件复制了 day02 所需的最小模型调用能力，避免跨 day import。
 */
// 教学：导出常量：其它文件可以 import 这个值，适合放默认配置或元信息。
export const DEFAULT_OLLAMA_HOST = 'http://127.0.0.1:11434';
// 教学：导出常量：其它文件可以 import 这个值，适合放默认配置或元信息。
export const DEFAULT_MODEL = 'qwen2.5:7b';

/** 去掉 host 末尾的斜杠，避免拼接 URL 时出现双斜杠。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function normalizeHost(host) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return String(host || DEFAULT_OLLAMA_HOST).replace(/\/+$/, '');
}

/** 创建一个只包含 chat 方法的最小 Ollama client。 */
// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createOllamaClient({
  // 教学：读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
  host = process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST,
  // 教学：读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
  model = process.env.OLLAMA_MODEL || DEFAULT_MODEL,
  fetchImpl = globalThis.fetch,
} = {}) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const baseUrl = normalizeHost(host);
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    host: baseUrl,
    model,
    /** 调用 Ollama /api/chat，返回模型文本内容。 */
    async chat(messages) {
      // /api/chat 是 Ollama 的聊天接口：planner、critic、writer 都通过它让本地模型生成文本。
      // 教学：发起 HTTP 请求：这里会访问本地 API 或 Ollama 服务。
      const response = await fetchImpl(`${baseUrl}/api/chat`, {
        // POST 用来提交本轮多 agent 的上下文和角色提示词。
        method: 'POST',
        // 明确告诉 Ollama body 是 JSON 格式。
        headers: { 'content-type': 'application/json' },
        // fetch body 只能传字符串；这里把教学用请求对象转成 JSON 字符串。
        // 教学：序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
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
      // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (!response.ok) {
        // 教学：抛出错误：让调用方知道当前流程不能继续。
        throw new Error(`Ollama 请求失败: HTTP ${response.status}`);
      }
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const data = await response.json();
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const content = data?.message?.content;
      // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (typeof content !== 'string' || !content.trim()) {
        // 教学：抛出错误：让调用方知道当前流程不能继续。
        throw new Error('Ollama 返回格式不符合预期');
      }
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return content;
    },
  };
}
