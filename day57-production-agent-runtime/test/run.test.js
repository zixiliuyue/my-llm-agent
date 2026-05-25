/**
 * Day 57：自包含学习源码。
 *
 * 这个文件属于 day57-production-agent-runtime，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证生产级 Runtime 的持久化、幂等、租约、取消、超时、重试和恢复。
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createRuntime, runDemo } from "../src/index.js";

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const runtime = createRuntime({ maxConcurrentRuns: 1, leaseMs: 1000 });
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const session = runtime.createSession({ userId: "u1", projectId: "p1" });
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const first = runtime.createRun({ sessionId: session.id, input: "hello", idempotencyKey: "same" });
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const second = runtime.createRun({ sessionId: session.id, input: "hello again", idempotencyKey: "same" });
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(first.id, second.id);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const leased = runtime.leaseRun("worker-1");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(leased.status, "running");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runtime.leaseRun("worker-2"), null);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const toolCall = runtime.recordToolCall(leased.id, { name: "search", input: {}, output: { ok: true } });
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(toolCall.status, "succeeded");
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const evidence = runtime.appendEvidence(leased.id, { source: "log", text: "ok" });
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(evidence.source, "log");

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const cancelledRun = runtime.createRun({ sessionId: session.id, input: "cancel me" });
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runtime.cancelRun(cancelledRun.id).status, "cancelled");

// 教学：调用函数：把当前数据交给已有逻辑处理。
runtime.markTimeouts("2026-05-25T10:02:00.000Z");
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const timedOut = runtime.snapshot().runs.find((run) => run.id === leased.id);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(timedOut.status, "timed_out");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runtime.retryRun(leased.id).status, "retry_waiting");

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const retried = runtime.leaseRun("worker-3");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(retried.id, leased.id);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runtime.recoverExpiredLeases("2026-05-25T10:02:02.000Z"), 1);
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const recovered = runtime.snapshot().runs.find((run) => run.id === leased.id);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(recovered.status, "queued");

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const demo = runDemo();
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(demo.completed.status, "succeeded");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(demo.snapshot.runs[0].toolCalls.length > 0);

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day57 tests passed");
