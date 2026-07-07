/**
 * Day 7：自包含学习源码。
 *
 * 这个文件属于 day07-deploy-and-test-env，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 导出常量：其它文件可以 import 这个值，适合放默认配置或元信息。
export const DEFAULT_LOCAL_OLLAMA_HOST = 'http://127.0.0.1:11434';
// 导出常量：其它文件可以 import 这个值，适合放默认配置或元信息。
export const DEFAULT_MODEL = 'qwen2.5:7b';

/** 规范化 Ollama 地址，避免结尾斜杠影响 API 拼接。 */
export function normalizeHost(host = DEFAULT_LOCAL_OLLAMA_HOST) {
  return String(host || DEFAULT_LOCAL_OLLAMA_HOST).replace(/\/+$/, '');
}

/** 从环境变量生成 Ollama 配置，避免把地址写死在源码里。 */
export function buildOllamaConfig(env = process.env) {
  return {
    host: normalizeHost(env.OLLAMA_HOST || DEFAULT_LOCAL_OLLAMA_HOST),
    model: env.OLLAMA_MODEL || DEFAULT_MODEL,
    source: env.OLLAMA_HOST ? 'env' : 'default-local',
  };
}

/** 生成测试环境 Docker dry-run 命令，不实际部署。 */
export function buildDockerDryRun({
  // 更新状态：这里会改变前面定义的变量或对象字段。
  port = '11434',
  // 更新状态：这里会改变前面定义的变量或对象字段。
  modelDir = '/data9/ollama',
} = {}) {
  const safePort = String(port).trim() || '11434';
  const safeModelDir = String(modelDir).trim() || '/data9/ollama';
  return [
    'docker run -d \\',
    '  --name ollama-agent-learning \\',
    `  -p ${safePort}:11434 \\`,
    `  -v ${safeModelDir}:/root/.ollama \\`,
    '  ollama/ollama:latest',
  ].join('\n');
}

/** 检查 Ollama API 健康状态，失败时给出结构化错误。 */
// 导出异步函数：调用方需要 await 它，因为内部可能读文件、请求接口或等待模型。
export async function checkOllamaHealth({
  host,
  // 更新状态：这里会改变前面定义的变量或对象字段。
  fetchImpl = globalThis.fetch,
} = {}) {
  const baseUrl = normalizeHost(host);
  try {
    // /api/tags 是 Ollama 的只读模型列表接口：健康检查用它确认服务在线。
    // 发起 HTTP 请求：这里会访问本地 API 或 Ollama 服务。
    const response = await fetchImpl(`${baseUrl}/api/tags`);
    if (!response.ok) {
      return { ok: false, host: baseUrl, error: `HTTP ${response.status}` };
    }
    const body = await response.json();
    return {
      ok: true,
      host: baseUrl,
      models: Array.isArray(body.models) ? body.models.map((item) => item.name).filter(Boolean) : [],
    };
  } catch (error) {
    return { ok: false, host: baseUrl, error: error.message };
  }
}
