/**
 * Day 7：自包含学习源码。
 *
 * 这个文件属于 day07-deploy-and-test-env，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
export const DEFAULT_LOCAL_OLLAMA_HOST = 'http://127.0.0.1:11434';
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
  port = '11434',
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
export async function checkOllamaHealth({
  host,
  fetchImpl = globalThis.fetch,
} = {}) {
  const baseUrl = normalizeHost(host);
  try {
    // /api/tags 是 Ollama 的只读模型列表接口：健康检查用它确认服务在线。
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
