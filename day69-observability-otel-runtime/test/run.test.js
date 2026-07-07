/**
 * Day 69 测试：验证结构化日志、Prometheus 指标、Jaeger payload 和 trace 关联。
 */
import assert from "node:assert/strict";
import { createObservability, runDemo, runObservedAgent } from "../src/index.js";

const obs = createObservability();
const run = runObservedAgent("test goal", obs);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(run.status, "completed");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(obs.logs().length, 2);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(obs.spans().length, 2);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(obs.spans()[1].traceId, obs.spans()[0].traceId);

const metrics = obs.prometheus();
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.match(metrics, /agent_runs_total/);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.match(metrics, /agent_tool_latency_ms_count/);

const jaeger = obs.jaeger();
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(jaeger.data[0].spans.length, 2);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(jaeger.data[0].spans[0].operationName, "agent.run");

const demo = runDemo();
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.day, 69);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.match(demo.prometheus, /agent_tool_calls_total/);

console.log("day69 tests passed");
