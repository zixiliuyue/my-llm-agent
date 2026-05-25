// 学习目标：验证图片任务队列的状态机和统计结果。
import assert from "node:assert/strict";
import { createImageJob, reduceQueue, summarizeQueue, transitionJob } from "../src/index.js";

const job = createImageJob({ prompt: "local image" });
assert.equal(job.status, "queued");

const running = transitionJob(job, { type: "start" });
assert.equal(running.status, "running");
assert.equal(running.progress, 1);

const done = transitionJob(running, { type: "done", output: "outputs/a.png" });
assert.equal(done.status, "done");
assert.equal(done.progress, 100);

let queue = [];
queue = reduceQueue(queue, { type: "enqueue", payload: { prompt: "first" } });
queue = reduceQueue(queue, { type: "enqueue", payload: { prompt: "second" } });
queue = reduceQueue(queue, { type: "update", id: queue[0].id, event: { type: "error", error: "mock failed" } });

const summary = summarizeQueue(queue);
assert.equal(summary.total, 2);
assert.equal(summary.error, 1);
assert.equal(summary.queued, 1);

console.log("day34 tests passed");
