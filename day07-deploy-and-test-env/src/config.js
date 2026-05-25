/**
 * Day 7：自包含学习源码。
 *
 * 这个文件属于 day07-deploy-and-test-env，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 教学：导出常量：其它文件可以 import 这个值，适合放默认配置或元信息。
export const DEFAULT_LOCAL_OLLAMA_HOST = 'http://127.0.0.1:11434';
// 教学：导出常量：其它文件可以 import 这个值，适合放默认配置或元信息。
export const DEFAULT_MODEL = 'qwen2.5:7b';

/** 规范化 Ollama 地址，避免结尾斜杠影响 API 拼接。 */
// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function normalizeHost(host = DEFAULT_LOCAL_OLLAMA_HOST) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return String(host || DEFAULT_LOCAL_OLLAMA_HOST).replace(/\/+$/, '');
}

/** 从环境变量生成 Ollama 配置，避免把地址写死在源码里。 */
// 教学：读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
export function buildOllamaConfig(env = process.env) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    host: normalizeHost(env.OLLAMA_HOST || DEFAULT_LOCAL_OLLAMA_HOST),
    model: env.OLLAMA_MODEL || DEFAULT_MODEL,
    source: env.OLLAMA_HOST ? 'env' : 'default-local',
  };
}

/** 生成测试环境 Docker dry-run 命令，不实际部署。 */
// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function buildDockerDryRun({
  // 教学：更新状态：这里会改变前面定义的变量或对象字段。
  port = '11434',
  // 教学：更新状态：这里会改变前面定义的变量或对象字段。
  modelDir = '/data9/ollama',
} = {}) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const safePort = String(port).trim() || '11434';
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const safeModelDir = String(modelDir).trim() || '/data9/ollama';
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return [
    'docker run -d \\',
    '  --name ollama-agent-learning \\',
    `  -p ${safePort}:11434 \\`,
    `  -v ${safeModelDir}:/root/.ollama \\`,
    '  ollama/ollama:latest',
  ].join('\n');
}

/** 检查 Ollama API 健康状态，失败时给出结构化错误。 */
// 教学：导出异步函数：调用方需要 await 它，因为内部可能读文件、请求接口或等待模型。
export async function checkOllamaHealth({
  host,
  // 教学：更新状态：这里会改变前面定义的变量或对象字段。
  fetchImpl = globalThis.fetch,
} = {}) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const baseUrl = normalizeHost(host);
  // 教学：try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
  try {
    // /api/tags 是 Ollama 的只读模型列表接口：健康检查用它确认服务在线。
    // 教学：发起 HTTP 请求：这里会访问本地 API 或 Ollama 服务。
    const response = await fetchImpl(`${baseUrl}/api/tags`);
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!response.ok) {
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return { ok: false, host: baseUrl, error: `HTTP ${response.status}` };
    }
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const body = await response.json();
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return {
      ok: true,
      host: baseUrl,
      models: Array.isArray(body.models) ? body.models.map((item) => item.name).filter(Boolean) : [],
    };
  // 教学：catch 块：把异常转换成可理解的错误结果或退出码。
  } catch (error) {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return { ok: false, host: baseUrl, error: error.message };
  }
}
