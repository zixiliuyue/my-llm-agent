/**
 * Day 34：自包含学习源码。
 *
 * 这个文件属于 day34-image-job-queue-ui，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证图片任务队列的状态机和统计结果。
import assert from "node:assert/strict";
import { createImageJob, reduceQueue, summarizeQueue, transitionJob } from "../src/index.js";

const job = createImageJob({ prompt: "local image" });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(job.status, "queued");

const running = transitionJob(job, { type: "start" });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(running.status, "running");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(running.progress, 1);

const done = transitionJob(running, { type: "done", output: "outputs/a.png" });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(done.status, "done");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(done.progress, 100);

let queue = [];
// 更新状态：这里会改变前面定义的变量或对象字段。
queue = reduceQueue(queue, { type: "enqueue", payload: { prompt: "first" } });
// 更新状态：这里会改变前面定义的变量或对象字段。
queue = reduceQueue(queue, { type: "enqueue", payload: { prompt: "second" } });
// 更新状态：这里会改变前面定义的变量或对象字段。
queue = reduceQueue(queue, { type: "update", id: queue[0].id, event: { type: "error", error: "mock failed" } });

const summary = summarizeQueue(queue);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(summary.total, 2);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(summary.error, 1);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(summary.queued, 1);

console.log("day34 tests passed");
