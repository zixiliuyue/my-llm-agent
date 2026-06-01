/**
 * Day 58：自包含学习源码。
 *
 * 这个文件属于 day58-agent-harness-eval-replay，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证 Agent Harness 能回放、比较、评分并作为 CI gate。
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { compareRuns, createMockSnapshots, evaluateSuite, replayRun, runGate, scoreRun } from "../src/index.js";

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const snapshots = createMockSnapshots();
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const replay = replayRun(snapshots[0]);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(replay.deterministic, true);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(replay.events.some((event) => event.type === "tool_call"));

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const score = scoreRun(snapshots[0], {
  id: "case-tool-call",
  expectedTools: ["query_metrics"],
  requiredCitations: ["metrics:p95"],
  maxLatencyMs: 1200,
});
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(score.ok, true);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const regression = compareRuns(snapshots[0], { ...snapshots[0], runId: "candidate", latencyMs: 2000 });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(regression.regression, true);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const suite = evaluateSuite();
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(suite.ok, true);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runGate().ok, true);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const failed = evaluateSuite({ snapshots: [snapshots[0]] });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(failed.ok, false);

// 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day58 tests passed");
