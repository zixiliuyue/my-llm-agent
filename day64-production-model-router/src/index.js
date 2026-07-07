/**
 * Day 64：生产级模型 Provider Router。
 *
 * 学习目标：统一 OpenAI/Claude/Qwen/Ollama provider 接口，覆盖 streaming、tool calling、
 * JSON schema、retry、timeout、rate limit、token/cost 统计和 fallback。默认使用 mock provider，
 * 真实 provider 只读取环境变量，不要求密钥存在。
 */

const COST_TABLE = {
  openai: 0.002,
  claude: 0.003,
  qwen: 0.001,
  ollama: 0,
  mock: 0,
};

function countTokens(text) {
  return Math.max(1, String(text).trim().split(/\s+/).filter(Boolean).length);
}

function validateJsonSchema(value, schema) {
  if (!schema) return { ok: true, errors: [] };
  const errors = [];
  for (const key of schema.required || []) {
    if (!(key in value)) errors.push(`missing ${key}`);
  }
  for (const [key, rule] of Object.entries(schema.properties || {})) {
    if (key in value && typeof value[key] !== rule.type) errors.push(`${key} should be ${rule.type}`);
  }
  return { ok: errors.length === 0, errors };
}

/** 读取真实 provider 环境变量，但不强制存在密钥。 */
export function loadProviderConfig(env = process.env) {
  return {
    openai: { apiKeyPresent: Boolean(env.OPENAI_API_KEY), model: env.OPENAI_MODEL || "gpt-4.1-mini" },
    claude: { apiKeyPresent: Boolean(env.ANTHROPIC_API_KEY), model: env.CLAUDE_MODEL || "claude-3-5-sonnet" },
    qwen: { apiKeyPresent: Boolean(env.DASHSCOPE_API_KEY), model: env.QWEN_MODEL || "qwen-plus" },
    ollama: { host: env.OLLAMA_HOST || "http://127.0.0.1:11434", model: env.OLLAMA_MODEL || "qwen2.5:7b" },
  };
}

/** 创建 mock provider；真实 provider 只要实现同样接口即可接入 router。 */
export function createMockProvider({
  name,
  model,
  capabilities = ["chat"],
  priority = 10,
  failTimes = 0,
  delayMs = 20,
  rateLimit = 10,
  response = "mock answer",
} = {}) {
  let failuresLeft = failTimes;
  let remaining = rateLimit;
  return {
    name,
    model,
    capabilities,
    priority,
    delayMs,
    get remaining() {
      return remaining;
    },
    async complete(request) {
      if (remaining <= 0) throw new Error("rate limit exceeded");
      remaining -= 1;
      if (this.delayMs > request.timeoutMs) throw new Error("timeout");
      if (failuresLeft > 0) {
        failuresLeft -= 1;
        throw new Error("provider temporary failure");
      }
      if (request.responseFormat?.type === "json_schema") {
        return {
          content: { answer: response, confidence: 0.92 },
          usage: { inputTokens: countTokens(request.prompt), outputTokens: countTokens(response) },
        };
      }
      return {
        content: `${response} via ${name}`,
        usage: { inputTokens: countTokens(request.prompt), outputTokens: countTokens(response) },
      };
    },
    async *stream(request) {
      const result = await this.complete(request);
      for (const part of String(result.content).split(/\s+/)) {
        yield { type: "delta", text: part };
      }
    },
    async callTool(request) {
      if (!capabilities.includes("tool_calling")) throw new Error("tool calling unsupported");
      return { toolName: request.toolName, arguments: request.arguments || {}, provider: name };
    },
  };
}

/** 创建模型路由器；所有重试、降级、统计都在模型外部实现。 */
export function createModelRouter({ providers, maxRetries = 1, timeoutMs = 1000 } = {}) {
  const stats = {
    calls: 0,
    failures: 0,
    fallbacks: 0,
    tokens: 0,
    estimatedCost: 0,
    providerCalls: {},
  };

  function candidates(capability) {
    return providers
      .filter((provider) => provider.capabilities.includes(capability))
      .sort((left, right) => left.priority - right.priority);
  }

  async function withFallback(capability, request, handler) {
    const errors = [];
    const list = candidates(capability);
    if (list.length === 0) throw new Error(`没有 provider 支持 ${capability}`);
    for (const provider of list) {
      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        stats.calls += 1;
        stats.providerCalls[provider.name] = (stats.providerCalls[provider.name] || 0) + 1;
        try {
          const result = await handler(provider, { ...request, timeoutMs });
          const usage = result.usage || { inputTokens: 0, outputTokens: 0 };
          const tokenCount = usage.inputTokens + usage.outputTokens;
          stats.tokens += tokenCount;
          stats.estimatedCost = Number((stats.estimatedCost + tokenCount * (COST_TABLE[provider.name] || COST_TABLE.mock) / 1000).toFixed(6));
          return { provider: provider.name, model: provider.model, attempts: attempt + 1, result, stats: { ...stats } };
        } catch (error) {
          errors.push({ provider: provider.name, attempt: attempt + 1, error: error.message });
          stats.failures += 1;
        }
      }
      stats.fallbacks += 1;
    }
    throw new Error(`所有 provider 失败: ${JSON.stringify(errors)}`);
  }

  return {
    complete(request) {
      return withFallback("chat", request, (provider, scopedRequest) => provider.complete(scopedRequest));
    },
    async json(request) {
      const response = await withFallback("json_schema", {
        ...request,
        responseFormat: { type: "json_schema", schema: request.schema },
      }, (provider, scopedRequest) => provider.complete(scopedRequest));
      const validation = validateJsonSchema(response.result.content, request.schema);
      return { ...response, validation };
    },
    async stream(request) {
      return withFallback("streaming", request, async (provider, scopedRequest) => {
        const chunks = [];
        for await (const chunk of provider.stream(scopedRequest)) chunks.push(chunk);
        return {
          content: chunks,
          usage: { inputTokens: countTokens(scopedRequest.prompt), outputTokens: chunks.length },
        };
      });
    },
    toolCall(request) {
      return withFallback("tool_calling", request, (provider, scopedRequest) => provider.callTool(scopedRequest));
    },
    stats() {
      return { ...stats };
    },
  };
}

/** CLI demo：先让高优先级 provider 失败，再 fallback 到 Ollama mock。 */
export async function runDemo() {
  const envConfig = loadProviderConfig({});
  const router = createModelRouter({
    providers: [
      createMockProvider({ name: "openai", model: envConfig.openai.model, capabilities: ["chat", "streaming", "json_schema", "tool_calling"], priority: 1, failTimes: 2, response: "primary" }),
      createMockProvider({ name: "ollama", model: envConfig.ollama.model, capabilities: ["chat", "streaming", "json_schema", "tool_calling"], priority: 2, response: "fallback local answer" }),
    ],
    maxRetries: 1,
    timeoutMs: 100,
  });
  const completion = await router.complete({ prompt: "解释 agent runtime fallback" });
  const structured = await router.json({
    prompt: "输出 JSON",
    schema: { required: ["answer", "confidence"], properties: { answer: { type: "string" }, confidence: { type: "number" } } },
  });
  const stream = await router.stream({ prompt: "stream answer" });
  const tool = await router.toolCall({ toolName: "searchDocs", arguments: { query: "runtime" } });

  return {
    day: 64,
    title: "production-model-router",
    localOnly: true,
    envConfig,
    completion,
    structured,
    stream,
    tool,
    stats: router.stats(),
  };
}
