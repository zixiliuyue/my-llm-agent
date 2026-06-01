/**
 * Day 38：自包含学习源码。
 *
 * 这个文件属于 day38-local-video-first-step，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证短视频第一步只接受本地图片并给出保守计划。
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { buildImageToVideoPlan, parseSize, recommendVideoFirstStep, runDemo } from "../src/index.js";

// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.deepEqual(parseSize("576x1024"), { width: 576, height: 1024 });

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const plan = buildImageToVideoPlan({ sourceImage: "outputs/a.png", frames: 12, size: "512x512" });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(plan.localOnly, true);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(plan.estimatedLoad, "medium");

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const win = recommendVideoFirstStep({ platform: "win32", gpuVendor: "nvidia", vramGb: 16 });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(win.canTry, true);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const mac = recommendVideoFirstStep({ platform: "darwin", gpuVendor: "apple", vramGb: 16 });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(mac.canTry, false);

// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.throws(() => buildImageToVideoPlan({ sourceImage: "https://example.com/a.png" }), /local image/);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runDemo().day, 38);

// 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day38 tests passed");
