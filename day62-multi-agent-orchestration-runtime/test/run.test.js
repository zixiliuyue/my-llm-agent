/**
 * Day 62 测试：验证 fan-out/fan-in、冲突、失败、预算、取消和 timeout。
 */
import assert from "node:assert/strict";
import { runDemo, runGraph, validateGraph } from "../src/index.js";

const graph = {
  id: "ok",
  goal: "demo",
  nodes: [
    { id: "a", agent: "agent-a", writes: ["a"] },
    { id: "b", agent: "agent-b", writes: ["b"] },
    { id: "c", agent: "agent-c", dependsOn: ["a", "b"], writes: ["c"] },
  ],
};
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(validateGraph(graph), true);
const ok = runGraph(graph, { maxConcurrency: 2 });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(ok.status, "completed");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.deepEqual(ok.completed.sort(), ["a", "b", "c"]);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(ok.handoffs.length, 3);

const conflict = runGraph({
  id: "conflict",
  goal: "demo",
  nodes: [
    { id: "a", agent: "agent-a", writes: ["shared"] },
    { id: "b", agent: "agent-b", writes: ["shared"] },
  ],
}, { maxConcurrency: 2 });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(conflict.status, "blocked");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(conflict.conflicts[0].key, "shared");

const partial = runGraph({
  id: "partial",
  goal: "demo",
  nodes: [
    { id: "a", agent: "agent-a", failure: true, canContinueOnFailure: true },
    { id: "b", agent: "agent-b" },
  ],
});
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(partial.status, "partial-failure");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.deepEqual(partial.failed, ["a"]);

// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(runGraph(graph, { budgetLimit: 1 }).status, "budget-exceeded");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(runGraph(graph, { cancelAfterStep: 1 }).status, "cancelled");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(runGraph({ ...graph, nodes: [{ id: "slow", agent: "slow", durationMs: 2000 }] }, { timeoutMs: 100 }).status, "timeout");

const demo = runDemo();
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.day, 62);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.result.status, "completed");

console.log("day62 tests passed");
