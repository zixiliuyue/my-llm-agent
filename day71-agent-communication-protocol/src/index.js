/**
 * Day 71：多 Agent 通信协议与消息格式标准。
 *
 * 学习目标：定义统一消息 envelope、JSON-RPC request/response、pub/sub broker 和 schema 校验，
 * 为未来 NATS/Redis/gRPC 替换保留清晰边界。
 */

const JSONRPC_VERSION = "2.0";

/** 创建标准消息 envelope。 */
export function createEnvelope({ type, from, to = null, topic = null, payload, correlationId = `corr-${Date.now()}` }) {
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
export function validateEnvelope(envelope) {
  const errors = [];
  if (envelope.protocol !== "mini-acp") errors.push("protocol invalid");
  if (!["request", "response", "event"].includes(envelope.type)) errors.push("type invalid");
  if (!envelope.from) errors.push("from required");
  if (envelope.type !== "event" && !envelope.to) errors.push("to required");
  if (envelope.type === "event" && !envelope.topic) errors.push("topic required");
  return { ok: errors.length === 0, errors };
}

/** 创建 JSON-RPC 请求。 */
export function createJsonRpcRequest(method, params, id = `rpc-${Date.now()}`) {
  return { jsonrpc: JSONRPC_VERSION, id, method, params };
}

/** 创建 JSON-RPC 响应。 */
export function createJsonRpcResponse(request, result, error = null) {
  return error
    ? { jsonrpc: JSONRPC_VERSION, id: request.id, error }
    : { jsonrpc: JSONRPC_VERSION, id: request.id, result };
}

/** 创建内存 broker，模拟 NATS/Redis pub-sub 和 request-response。 */
export function createMemoryBroker() {
  const agents = new Map();
  const subscriptions = new Map();
  const audit = [];

  return {
    register(agentId, handler) {
      agents.set(agentId, handler);
    },
    subscribe(topic, agentId) {
      subscriptions.set(topic, [...(subscriptions.get(topic) || []), agentId]);
    },
    request(envelope) {
      const validation = validateEnvelope(envelope);
      if (!validation.ok) throw new Error(validation.errors.join("; "));
      const handler = agents.get(envelope.to);
      if (!handler) throw new Error(`agent ${envelope.to} 未注册`);
      audit.push({ direction: "request", envelope });
      const responsePayload = handler(envelope.payload, envelope);
      const response = createEnvelope({
        type: "response",
        from: envelope.to,
        to: envelope.from,
        correlationId: envelope.correlationId,
        payload: responsePayload,
      });
      audit.push({ direction: "response", envelope: response });
      return response;
    },
    publish(envelope) {
      const validation = validateEnvelope(envelope);
      if (!validation.ok) throw new Error(validation.errors.join("; "));
      const targets = subscriptions.get(envelope.topic) || [];
      audit.push({ direction: "event", envelope, deliveredTo: targets });
      return targets.map((agentId) => agents.get(agentId)?.(envelope.payload, envelope)).filter(Boolean);
    },
    audit() {
      return [...audit];
    },
  };
}

/** CLI demo：planner 通过 JSON-RPC 请求 worker，worker 发布事件给 reviewer。 */
export function runDemo() {
  const broker = createMemoryBroker();
  broker.register("worker-agent", (payload) => createJsonRpcResponse(payload, { status: "ok", evidence: "tool completed" }));
  broker.register("reviewer-agent", (payload) => ({ reviewed: true, payload }));
  broker.subscribe("agent.events.tool.completed", "reviewer-agent");

  const rpc = createJsonRpcRequest("tool.run", { tool: "searchDocs", input: "runtime" }, "rpc-1");
  const response = broker.request(createEnvelope({
    type: "request",
    from: "planner-agent",
    to: "worker-agent",
    correlationId: "corr-1",
    payload: rpc,
  }));
  const delivered = broker.publish(createEnvelope({
    type: "event",
    from: "worker-agent",
    topic: "agent.events.tool.completed",
    correlationId: "corr-1",
    payload: response.payload.result,
  }));

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
