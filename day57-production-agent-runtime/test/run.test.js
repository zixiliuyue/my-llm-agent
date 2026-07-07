/**
 * Day 57：自包含学习源码。
 *
 * 这个文件属于 day57-production-agent-runtime，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证生产级 Runtime 的持久化、幂等、租约、取消、超时、重试和恢复。
import assert from "node:assert/strict";
import { createRuntime, runDemo } from "../src/index.js";

const runtime = createRuntime({ maxConcurrentRuns: 1, leaseMs: 1000 });
const session = runtime.createSession({ userId: "u1", projectId: "p1" });
const first = runtime.createRun({ sessionId: session.id, input: "hello", idempotencyKey: "same" });
const second = runtime.createRun({ sessionId: session.id, input: "hello again", idempotencyKey: "same" });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(first.id, second.id);

const leased = runtime.leaseRun("worker-1");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(leased.status, "running");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runtime.leaseRun("worker-2"), null);

const toolCall = runtime.recordToolCall(leased.id, { name: "search", input: {}, output: { ok: true } });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(toolCall.status, "succeeded");
const evidence = runtime.appendEvidence(leased.id, { source: "log", text: "ok" });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(evidence.source, "log");

const cancelledRun = runtime.createRun({ sessionId: session.id, input: "cancel me" });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runtime.cancelRun(cancelledRun.id).status, "cancelled");

// 调用函数：把当前数据交给已有逻辑处理。
runtime.markTimeouts("2026-05-25T10:02:00.000Z");
const timedOut = runtime.snapshot().runs.find((run) => run.id === leased.id);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(timedOut.status, "timed_out");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runtime.retryRun(leased.id).status, "retry_waiting");

const retried = runtime.leaseRun("worker-3");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(retried.id, leased.id);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runtime.recoverExpiredLeases("2026-05-25T10:02:02.000Z"), 1);
const recovered = runtime.snapshot().runs.find((run) => run.id === leased.id);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(recovered.status, "queued");

const demo = runDemo();
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(demo.completed.status, "succeeded");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(demo.snapshot.runs[0].toolCalls.length > 0);

console.log("day57 tests passed");
