/**
 * Day 71 测试：验证 envelope、JSON-RPC、request-response 和 pub/sub。
 */
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createEnvelope, createJsonRpcRequest, createJsonRpcResponse, createMemoryBroker, runDemo, validateEnvelope } from "../src/index.js";

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const request = createJsonRpcRequest("agent.plan", { goal: "x" }, "rpc-1");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(request.jsonrpc, "2.0");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(createJsonRpcResponse(request, { ok: true }).result.ok, true);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const envelope = createEnvelope({ type: "request", from: "a", to: "b", payload: request });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(validateEnvelope(envelope).ok, true);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(validateEnvelope(createEnvelope({ type: "event", from: "a", payload: {} })).ok, false);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const broker = createMemoryBroker();
broker.register("b", (payload) => createJsonRpcResponse(payload, { done: true }));
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const response = broker.request(envelope);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(response.payload.result.done, true);

broker.register("subscriber", (payload) => ({ got: payload.value }));
broker.subscribe("topic", "subscriber");
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const delivered = broker.publish(createEnvelope({ type: "event", from: "a", topic: "topic", payload: { value: 7 } }));
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.deepEqual(delivered, [{ got: 7 }]);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(broker.audit().length, 3);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const demo = runDemo();
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.day, 71);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.delivered[0].reviewed, true);

// 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day71 tests passed");
