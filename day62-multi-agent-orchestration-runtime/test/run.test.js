/**
 * Day 62 测试：验证 fan-out/fan-in、冲突、失败、预算、取消和 timeout。
 */
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { runDemo, runGraph, validateGraph } from "../src/index.js";

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const graph = {
  id: "ok",
  goal: "demo",
  nodes: [
    { id: "a", agent: "agent-a", writes: ["a"] },
    { id: "b", agent: "agent-b", writes: ["b"] },
    { id: "c", agent: "agent-c", dependsOn: ["a", "b"], writes: ["c"] },
  ],
};
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(validateGraph(graph), true);
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const ok = runGraph(graph, { maxConcurrency: 2 });
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(ok.status, "completed");
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.deepEqual(ok.completed.sort(), ["a", "b", "c"]);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(ok.handoffs.length, 3);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const conflict = runGraph({
  id: "conflict",
  goal: "demo",
  nodes: [
    { id: "a", agent: "agent-a", writes: ["shared"] },
    { id: "b", agent: "agent-b", writes: ["shared"] },
  ],
}, { maxConcurrency: 2 });
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(conflict.status, "blocked");
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(conflict.conflicts[0].key, "shared");

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const partial = runGraph({
  id: "partial",
  goal: "demo",
  nodes: [
    { id: "a", agent: "agent-a", failure: true, canContinueOnFailure: true },
    { id: "b", agent: "agent-b" },
  ],
});
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(partial.status, "partial-failure");
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.deepEqual(partial.failed, ["a"]);

// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(runGraph(graph, { budgetLimit: 1 }).status, "budget-exceeded");
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(runGraph(graph, { cancelAfterStep: 1 }).status, "cancelled");
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(runGraph({ ...graph, nodes: [{ id: "slow", agent: "slow", durationMs: 2000 }] }, { timeoutMs: 100 }).status, "timeout");

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const demo = runDemo();
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.day, 62);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.result.status, "completed");

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day62 tests passed");
