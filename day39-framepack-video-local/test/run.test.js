/**
 * Day 39：自包含学习源码。
 *
 * 这个文件属于 day39-framepack-video-local，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证 FramePack 只作为本地 NVIDIA 视频 profile。
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { buildFramePackJob, evaluateFramePackReadiness, runDemo } from "../src/index.js";

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const ready = evaluateFramePackReadiness({
  platform: "win32",
  gpuName: "NVIDIA GeForce RTX 5060 Ti",
  vramGb: 16,
  memoryGb: 32,
});
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(ready.ready, true);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const mac = evaluateFramePackReadiness({
  platform: "darwin",
  gpuName: "Apple M4",
  vramGb: 16,
  memoryGb: 32,
});
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(mac.ready, false);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(mac.issues.length > 0);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const job = buildFramePackJob({ sourceImage: "outputs/a.png", prompt: "local video" });
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(job.provider, "framepack:video");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(job.localOnly, true);

// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.throws(
  () => buildFramePackJob({ sourceImage: "outputs/a.png", prompt: "x", endpoint: "https://example.com" }),
  /must be local/
);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runDemo().day, 39);

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day39 tests passed");
