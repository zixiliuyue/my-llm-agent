/**
 * Day 71 测试：验证 envelope、JSON-RPC、request-response 和 pub/sub。
 */
import assert from "node:assert/strict";
import { createEnvelope, createJsonRpcRequest, createJsonRpcResponse, createMemoryBroker, runDemo, validateEnvelope } from "../src/index.js";

const request = createJsonRpcRequest("agent.plan", { goal: "x" }, "rpc-1");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(request.jsonrpc, "2.0");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(createJsonRpcResponse(request, { ok: true }).result.ok, true);

const envelope = createEnvelope({ type: "request", from: "a", to: "b", payload: request });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(validateEnvelope(envelope).ok, true);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(validateEnvelope(createEnvelope({ type: "event", from: "a", payload: {} })).ok, false);

const broker = createMemoryBroker();
broker.register("b", (payload) => createJsonRpcResponse(payload, { done: true }));
const response = broker.request(envelope);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(response.payload.result.done, true);

broker.register("subscriber", (payload) => ({ got: payload.value }));
broker.subscribe("topic", "subscriber");
const delivered = broker.publish(createEnvelope({ type: "event", from: "a", topic: "topic", payload: { value: 7 } }));
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.deepEqual(delivered, [{ got: 7 }]);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(broker.audit().length, 3);

const demo = runDemo();
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.day, 71);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.delivered[0].reviewed, true);

console.log("day71 tests passed");
