/**
 * Day 69 测试：验证结构化日志、Prometheus 指标、Jaeger payload 和 trace 关联。
 */
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createObservability, runDemo, runObservedAgent } from "../src/index.js";

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const obs = createObservability();
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const run = runObservedAgent("test goal", obs);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(run.status, "completed");
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(obs.logs().length, 2);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(obs.spans().length, 2);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(obs.spans()[1].traceId, obs.spans()[0].traceId);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const metrics = obs.prometheus();
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.match(metrics, /agent_runs_total/);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.match(metrics, /agent_tool_latency_ms_count/);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const jaeger = obs.jaeger();
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(jaeger.data[0].spans.length, 2);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(jaeger.data[0].spans[0].operationName, "agent.run");

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const demo = runDemo();
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.day, 69);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.match(demo.prometheus, /agent_tool_calls_total/);

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day69 tests passed");
