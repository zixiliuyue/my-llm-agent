/**
 * Day 71：多 Agent 通信协议与消息格式标准。
 *
 * 学习目标：定义统一消息 envelope、JSON-RPC request/response、pub/sub broker 和 schema 校验，
 * 为未来 NATS/Redis/gRPC 替换保留清晰边界。
 */

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const JSONRPC_VERSION = "2.0";

/** 创建标准消息 envelope。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function createEnvelope({ type, from, to = null, topic = null, payload, correlationId = `corr-${Date.now()}` }) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    protocol: "mini-acp",
    version: "1.0",
    type,
    from,
    to,
    topic,
    correlationId,
    timestamp: "2026-05-25T10:00:00.000Z",
    payload,
  };
}

/** 校验 envelope 是否满足最小通信协议。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function validateEnvelope(envelope) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const errors = [];
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (envelope.protocol !== "mini-acp") errors.push("protocol invalid");
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!["request", "response", "event"].includes(envelope.type)) errors.push("type invalid");
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!envelope.from) errors.push("from required");
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (envelope.type !== "event" && !envelope.to) errors.push("to required");
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (envelope.type === "event" && !envelope.topic) errors.push("topic required");
  // 返回结果：调用方会拿到这个值继续后续流程。
  return { ok: errors.length === 0, errors };
}

/** 创建 JSON-RPC 请求。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function createJsonRpcRequest(method, params, id = `rpc-${Date.now()}`) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return { jsonrpc: JSONRPC_VERSION, id, method, params };
}

/** 创建 JSON-RPC 响应。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function createJsonRpcResponse(request, result, error = null) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return error
    ? { jsonrpc: JSONRPC_VERSION, id: request.id, error }
    : { jsonrpc: JSONRPC_VERSION, id: request.id, result };
}

/** 创建内存 broker，模拟 NATS/Redis pub-sub 和 request-response。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function createMemoryBroker() {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const agents = new Map();
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const subscriptions = new Map();
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const audit = [];

  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    register(agentId, handler) {
      agents.set(agentId, handler);
    },
    subscribe(topic, agentId) {
      subscriptions.set(topic, [...(subscriptions.get(topic) || []), agentId]);
    },
    request(envelope) {
      // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const validation = validateEnvelope(envelope);
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (!validation.ok) throw new Error(validation.errors.join("; "));
      // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const handler = agents.get(envelope.to);
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (!handler) throw new Error(`agent ${envelope.to} 未注册`);
      audit.push({ direction: "request", envelope });
      // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const responsePayload = handler(envelope.payload, envelope);
      // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const response = createEnvelope({
        type: "response",
        from: envelope.to,
        to: envelope.from,
        correlationId: envelope.correlationId,
        payload: responsePayload,
      });
      audit.push({ direction: "response", envelope: response });
      // 返回结果：调用方会拿到这个值继续后续流程。
      return response;
    },
    publish(envelope) {
      // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const validation = validateEnvelope(envelope);
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (!validation.ok) throw new Error(validation.errors.join("; "));
      // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const targets = subscriptions.get(envelope.topic) || [];
      audit.push({ direction: "event", envelope, deliveredTo: targets });
      // 返回结果：调用方会拿到这个值继续后续流程。
      return targets.map((agentId) => agents.get(agentId)?.(envelope.payload, envelope)).filter(Boolean);
    },
    audit() {
      // 返回结果：调用方会拿到这个值继续后续流程。
      return [...audit];
    },
  };
}

/** CLI demo：planner 通过 JSON-RPC 请求 worker，worker 发布事件给 reviewer。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function runDemo() {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const broker = createMemoryBroker();
  broker.register("worker-agent", (payload) => createJsonRpcResponse(payload, { status: "ok", evidence: "tool completed" }));
  broker.register("reviewer-agent", (payload) => ({ reviewed: true, payload }));
  broker.subscribe("agent.events.tool.completed", "reviewer-agent");

  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const rpc = createJsonRpcRequest("tool.run", { tool: "searchDocs", input: "runtime" }, "rpc-1");
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const response = broker.request(createEnvelope({
    type: "request",
    from: "planner-agent",
    to: "worker-agent",
    correlationId: "corr-1",
    payload: rpc,
  }));
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const delivered = broker.publish(createEnvelope({
    type: "event",
    from: "worker-agent",
    topic: "agent.events.tool.completed",
    correlationId: "corr-1",
    payload: response.payload.result,
  }));

  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 71,
    title: "agent-communication-protocol",
    localOnly: true,
    request: rpc,
    response,
    delivered,
    audit: broker.audit(),
    transportNotes: ["JSON-RPC request-response", "pub-sub event", "NATS/Redis/gRPC replaceable boundary"],
  };
}
