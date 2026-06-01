/**
 * Day 64：生产级模型 Provider Router。
 *
 * 学习目标：统一 OpenAI/Claude/Qwen/Ollama provider 接口，覆盖 streaming、tool calling、
 * JSON schema、retry、timeout、rate limit、token/cost 统计和 fallback。默认使用 mock provider，
 * 真实 provider 只读取环境变量，不要求密钥存在。
 */

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const COST_TABLE = {
  openai: 0.002,
  claude: 0.003,
  qwen: 0.001,
  ollama: 0,
  mock: 0,
};

// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function countTokens(text) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return Math.max(1, String(text).trim().split(/\s+/).filter(Boolean).length);
}

// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function validateJsonSchema(value, schema) {
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!schema) return { ok: true, errors: [] };
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const errors = [];
  // 循环：按顺序处理多条数据或多个步骤。
  for (const key of schema.required || []) {
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!(key in value)) errors.push(`missing ${key}`);
  }
  // 循环：按顺序处理多条数据或多个步骤。
  for (const [key, rule] of Object.entries(schema.properties || {})) {
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (key in value && typeof value[key] !== rule.type) errors.push(`${key} should be ${rule.type}`);
  }
  // 返回结果：调用方会拿到这个值继续后续流程。
  return { ok: errors.length === 0, errors };
}

/** 读取真实 provider 环境变量，但不强制存在密钥。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function loadProviderConfig(env = process.env) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    openai: { apiKeyPresent: Boolean(env.OPENAI_API_KEY), model: env.OPENAI_MODEL || "gpt-4.1-mini" },
    claude: { apiKeyPresent: Boolean(env.ANTHROPIC_API_KEY), model: env.CLAUDE_MODEL || "claude-3-5-sonnet" },
    qwen: { apiKeyPresent: Boolean(env.DASHSCOPE_API_KEY), model: env.QWEN_MODEL || "qwen-plus" },
    ollama: { host: env.OLLAMA_HOST || "http://127.0.0.1:11434", model: env.OLLAMA_MODEL || "qwen2.5:7b" },
  };
}

/** 创建 mock provider；真实 provider 只要实现同样接口即可接入 router。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
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
  // 定义变量：这个值后面会被更新，所以使用 let。
  let failuresLeft = failTimes;
  // 定义变量：这个值后面会被更新，所以使用 let。
  let remaining = rateLimit;
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    name,
    model,
    capabilities,
    priority,
    delayMs,
    get remaining() {
      // 返回结果：调用方会拿到这个值继续后续流程。
      return remaining;
    },
    async complete(request) {
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (remaining <= 0) throw new Error("rate limit exceeded");
      remaining -= 1;
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (this.delayMs > request.timeoutMs) throw new Error("timeout");
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (failuresLeft > 0) {
        failuresLeft -= 1;
        // 抛出错误：让调用方知道当前流程不能继续。
        throw new Error("provider temporary failure");
      }
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (request.responseFormat?.type === "json_schema") {
        // 返回结果：调用方会拿到这个值继续后续流程。
        return {
          content: { answer: response, confidence: 0.92 },
          usage: { inputTokens: countTokens(request.prompt), outputTokens: countTokens(response) },
        };
      }
      // 返回结果：调用方会拿到这个值继续后续流程。
      return {
        content: `${response} via ${name}`,
        usage: { inputTokens: countTokens(request.prompt), outputTokens: countTokens(response) },
      };
    },
    async *stream(request) {
      // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const result = await this.complete(request);
      // 循环：按顺序处理多条数据或多个步骤。
      for (const part of String(result.content).split(/\s+/)) {
        yield { type: "delta", text: part };
      }
    },
    async callTool(request) {
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (!capabilities.includes("tool_calling")) throw new Error("tool calling unsupported");
      // 返回结果：调用方会拿到这个值继续后续流程。
      return { toolName: request.toolName, arguments: request.arguments || {}, provider: name };
    },
  };
}

/** 创建模型路由器；所有重试、降级、统计都在模型外部实现。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function createModelRouter({ providers, maxRetries = 1, timeoutMs = 1000 } = {}) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const stats = {
    calls: 0,
    failures: 0,
    fallbacks: 0,
    tokens: 0,
    estimatedCost: 0,
    providerCalls: {},
  };

  // 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
  function candidates(capability) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return providers
      .filter((provider) => provider.capabilities.includes(capability))
      .sort((left, right) => left.priority - right.priority);
  }

  // 异步函数：里面会 await 异步操作，所以调用时也要等待结果。
  async function withFallback(capability, request, handler) {
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const errors = [];
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const list = candidates(capability);
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (list.length === 0) throw new Error(`没有 provider 支持 ${capability}`);
    // 循环：按顺序处理多条数据或多个步骤。
    for (const provider of list) {
      // 循环：按顺序处理多条数据或多个步骤。
      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        stats.calls += 1;
        stats.providerCalls[provider.name] = (stats.providerCalls[provider.name] || 0) + 1;
        // try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
        try {
          // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
          const result = await handler(provider, { ...request, timeoutMs });
          // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
          const usage = result.usage || { inputTokens: 0, outputTokens: 0 };
          // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
          const tokenCount = usage.inputTokens + usage.outputTokens;
          stats.tokens += tokenCount;
          stats.estimatedCost = Number((stats.estimatedCost + tokenCount * (COST_TABLE[provider.name] || COST_TABLE.mock) / 1000).toFixed(6));
          // 返回结果：调用方会拿到这个值继续后续流程。
          return { provider: provider.name, model: provider.model, attempts: attempt + 1, result, stats: { ...stats } };
        // catch 块：把异常转换成可理解的错误结果或退出码。
        } catch (error) {
          errors.push({ provider: provider.name, attempt: attempt + 1, error: error.message });
          stats.failures += 1;
        }
      }
      stats.fallbacks += 1;
    }
    // 抛出错误：让调用方知道当前流程不能继续。
    throw new Error(`所有 provider 失败: ${JSON.stringify(errors)}`);
  }

  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    complete(request) {
      // 返回结果：调用方会拿到这个值继续后续流程。
      return withFallback("chat", request, (provider, scopedRequest) => provider.complete(scopedRequest));
    },
    async json(request) {
      // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const response = await withFallback("json_schema", {
        ...request,
        responseFormat: { type: "json_schema", schema: request.schema },
      }, (provider, scopedRequest) => provider.complete(scopedRequest));
      // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const validation = validateJsonSchema(response.result.content, request.schema);
      // 返回结果：调用方会拿到这个值继续后续流程。
      return { ...response, validation };
    },
    async stream(request) {
      // 返回结果：调用方会拿到这个值继续后续流程。
      return withFallback("streaming", request, async (provider, scopedRequest) => {
        // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
        const chunks = [];
        // 循环：按顺序处理多条数据或多个步骤。
        for await (const chunk of provider.stream(scopedRequest)) chunks.push(chunk);
        // 返回结果：调用方会拿到这个值继续后续流程。
        return {
          content: chunks,
          usage: { inputTokens: countTokens(scopedRequest.prompt), outputTokens: chunks.length },
        };
      });
    },
    toolCall(request) {
      // 返回结果：调用方会拿到这个值继续后续流程。
      return withFallback("tool_calling", request, (provider, scopedRequest) => provider.callTool(scopedRequest));
    },
    stats() {
      // 返回结果：调用方会拿到这个值继续后续流程。
      return { ...stats };
    },
  };
}

/** CLI demo：先让高优先级 provider 失败，再 fallback 到 Ollama mock。 */
// 异步函数：里面会 await 异步操作，所以调用时也要等待结果。
export async function runDemo() {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const envConfig = loadProviderConfig({});
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const router = createModelRouter({
    providers: [
      createMockProvider({ name: "openai", model: envConfig.openai.model, capabilities: ["chat", "streaming", "json_schema", "tool_calling"], priority: 1, failTimes: 2, response: "primary" }),
      createMockProvider({ name: "ollama", model: envConfig.ollama.model, capabilities: ["chat", "streaming", "json_schema", "tool_calling"], priority: 2, response: "fallback local answer" }),
    ],
    maxRetries: 1,
    timeoutMs: 100,
  });
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const completion = await router.complete({ prompt: "解释 agent runtime fallback" });
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const structured = await router.json({
    prompt: "输出 JSON",
    schema: { required: ["answer", "confidence"], properties: { answer: { type: "string" }, confidence: { type: "number" } } },
  });
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const stream = await router.stream({ prompt: "stream answer" });
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const tool = await router.toolCall({ toolName: "searchDocs", arguments: { query: "runtime" } });

  // 返回结果：调用方会拿到这个值继续后续流程。
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
