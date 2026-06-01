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
// qwen3:32b
// export const DEFAULT_MODEL = 'qwen3:32b';
/** 规范化 Ollama 地址，避免结尾斜杠影响 API 拼接。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function normalizeHost(host) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return String(host || DEFAULT_OLLAMA_HOST).replace(/\/+$/, '');
}

/** 把 Ollama 连接失败转换成更容易理解的中文提示。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function friendlyConnectionError(host, error) {
  // 返回结果：调用方会拿到这个值继续后续流程。
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
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createOllamaClient({
  // 读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
  host = process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST,
  // 读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
  model = process.env.OLLAMA_MODEL || DEFAULT_MODEL,
  fetchImpl = globalThis.fetch,
} = {}) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const baseUrl = normalizeHost(host);
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (typeof fetchImpl !== 'function') {
    // 抛出错误：让调用方知道当前流程不能继续。
    throw new Error('当前 Node 版本缺少 fetch，请使用 Node 18.17 或更高版本');
  }

  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    host: baseUrl,
    model,
    async chat(messages) {
      // 定义变量：这个值后面会被更新，所以使用 let。
      let response;
      // try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
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
            format: 'json',
            // stream=false 表示一次性等模型生成完整回答；CLI 教学里更容易解析和测试。
            stream: false,
            options: {
              // temperature 越低，模型越稳定；这里用 0.1 让 JSON 协议输出更可控。
              temperature: 0.1,
            },
          }),
        });
      } catch (error) {
        // 抛出错误：让调用方知道当前流程不能继续。
        throw friendlyConnectionError(baseUrl, error);
      }

      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (!response.ok) {
        // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
        const body = await response.text().catch(() => '');
        // 抛出错误：让调用方知道当前流程不能继续。
        throw new Error(`Ollama 请求失败: HTTP ${response.status}\n${body}`);
      }

      // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const data = await response.json();
      // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const content = data?.message?.content;
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (!content || typeof content !== 'string') {
        // 序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
        throw new Error(`Ollama 返回格式不符合预期: ${JSON.stringify(data)}`);
      }
      // 返回结果：调用方会拿到这个值继续后续流程。
      return content;
    },
  };
}

/** 读取 Ollama 本地模型列表，供环境检查使用。 */
// 导出异步函数：调用方需要 await 它，因为内部可能读文件、请求接口或等待模型。
export async function listOllamaModels({
  // 读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
  host = process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST,
  fetchImpl = globalThis.fetch,
  timeoutMs = 3000,
} = {}) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const baseUrl = normalizeHost(host);
  // 创建取消控制器：后面把 signal 传给 fetch，实现超时取消。
  const controller = new AbortController();
  // 设置超时：防止网络请求或子进程无限等待。
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
  try {
    // /api/tags 是 Ollama 的模型列表接口，用来确认服务是否启动、默认模型是否已拉取。
    // 发起 HTTP 请求：这里会访问本地 API 或 Ollama 服务。
    const response = await fetchImpl(`${baseUrl}/api/tags`, {
      // signal 连接 AbortController；超过 timeoutMs 会取消请求，避免 check 命令一直卡住。
      signal: controller.signal,
    });
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!response.ok) {
      // 返回结果：调用方会拿到这个值继续后续流程。
      return {
        ok: false,
        error: `HTTP ${response.status}`,
        models: [],
      };
    }
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const data = await response.json();
    // 返回结果：调用方会拿到这个值继续后续流程。
    return {
      ok: true,
      models: Array.isArray(data.models) ? data.models.map((item) => item.name).filter(Boolean) : [],
    };
  } catch (error) {
    // 返回结果：调用方会拿到这个值继续后续流程。
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
