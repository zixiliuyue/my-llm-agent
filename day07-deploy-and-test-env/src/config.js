export const DEFAULT_LOCAL_OLLAMA_HOST = 'http://127.0.0.1:11434';
export const DEFAULT_MODEL = 'qwen2.5:7b';

export function normalizeHost(host = DEFAULT_LOCAL_OLLAMA_HOST) {
  return String(host || DEFAULT_LOCAL_OLLAMA_HOST).replace(/\/+$/, '');
}

export function buildOllamaConfig(env = process.env) {
  return {
    host: normalizeHost(env.OLLAMA_HOST || DEFAULT_LOCAL_OLLAMA_HOST),
    model: env.OLLAMA_MODEL || DEFAULT_MODEL,
    source: env.OLLAMA_HOST ? 'env' : 'default-local',
  };
}

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

export async function checkOllamaHealth({
  host,
  fetchImpl = globalThis.fetch,
} = {}) {
  const baseUrl = normalizeHost(host);
  try {
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

