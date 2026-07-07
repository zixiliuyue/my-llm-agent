/**
 * Day 1：自包含学习源码。
 *
 * 这个文件属于 day01-single-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 导出常量：其它文件可以 import 这个值，适合放默认配置或元信息。
export const DEFAULT_OLLAMA_HOST = 'http://127.0.0.1:11434';
// 导出常量：其它文件可以 import 这个值，适合放默认配置或元信息。
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
        // Ollama 的 /api/chat 是“聊天补全”接口：把 messages 发送给本地模型，
        // Ollama 会返回下一条 assistant 消息。本示例所有真实模型回答都从这里来。
        // 发起 HTTP 请求：这里会访问本地 API 或 Ollama 服务。
        response = await fetchImpl(`${baseUrl}/api/chat`, {
          // POST 表示这次请求会提交一段对话内容给模型计算，不能用 GET。
          method: 'POST',
          // 告诉 Ollama 请求体是 JSON；如果漏掉，服务端可能无法正确解析 body。
          headers: { 'content-type': 'application/json' },
          // fetch 的 body 必须是字符串，所以要把下面的 JS 对象 JSON.stringify。
          // 序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
          body: JSON.stringify({
            // model 指定要调用哪个本地模型，例如 qwen2.5:7b。
            model,
            // messages 是完整对话上下文，通常包含 system 规则、user 问题和历史 observation。
            messages,
            // stream=false 表示一次性等模型生成完整回答；CLI 教学里更容易解析和测试。
            stream: false,
            options: {
              // temperature 越低，模型越稳定；这里用 0.1 让 JSON 协议输出更可控。
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
        // 序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
        throw new Error(`Ollama 返回格式不符合预期: ${JSON.stringify(data)}`);
      }
      return content;
    },
  };
}

/** 读取 Ollama 本地模型列表，供环境检查使用。 */
// 导出异步函数：调用方需要 await 它，因为内部可能读文件、请求接口或等待模型。
export async function listOllamaModels({
  host = process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST,
  fetchImpl = globalThis.fetch,
  timeoutMs = 3000,
} = {}) {
  const baseUrl = normalizeHost(host);
  // 创建取消控制器：后面把 signal 传给 fetch，实现超时取消。
  const controller = new AbortController();
  // 设置超时：防止网络请求或子进程无限等待。
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // /api/tags 是 Ollama 的模型列表接口，用来确认服务是否启动、默认模型是否已拉取。
    // 发起 HTTP 请求：这里会访问本地 API 或 Ollama 服务。
    const response = await fetchImpl(`${baseUrl}/api/tags`, {
      // signal 连接 AbortController；超过 timeoutMs 会取消请求，避免 check 命令一直卡住。
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
    // 清理超时计时器：请求结束后避免定时器继续占用资源。
    clearTimeout(timer);
  }
}
