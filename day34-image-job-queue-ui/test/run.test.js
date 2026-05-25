/**
 * Day 34：自包含学习源码。
 *
 * 这个文件属于 day34-image-job-queue-ui，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证图片任务队列的状态机和统计结果。
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createImageJob, reduceQueue, summarizeQueue, transitionJob } from "../src/index.js";

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const job = createImageJob({ prompt: "local image" });
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(job.status, "queued");

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const running = transitionJob(job, { type: "start" });
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(running.status, "running");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(running.progress, 1);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const done = transitionJob(running, { type: "done", output: "outputs/a.png" });
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(done.status, "done");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(done.progress, 100);

// 教学：定义变量：这个值后面会被更新，所以使用 let。
let queue = [];
// 教学：更新状态：这里会改变前面定义的变量或对象字段。
queue = reduceQueue(queue, { type: "enqueue", payload: { prompt: "first" } });
// 教学：更新状态：这里会改变前面定义的变量或对象字段。
queue = reduceQueue(queue, { type: "enqueue", payload: { prompt: "second" } });
// 教学：更新状态：这里会改变前面定义的变量或对象字段。
queue = reduceQueue(queue, { type: "update", id: queue[0].id, event: { type: "error", error: "mock failed" } });

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const summary = summarizeQueue(queue);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(summary.total, 2);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(summary.error, 1);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(summary.queued, 1);

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day34 tests passed");
