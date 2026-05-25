/**
 * Day 40：自包含学习源码。
 *
 * 这个文件属于 day40-wan-video-evaluation，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证 Wan 只进入评估清单，不成为 16G 显存默认视频路径。
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { evaluateWanForLearning, getVideoEvaluationProfile, rankVideoOptions, runDemo } from "../src/index.js";

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const winRanked = rankVideoOptions({ platform: "win32", gpuVendor: "nvidia", vramGb: 16 }).map((item) => item.id);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.deepEqual(winRanked, ["svd-image-to-video", "framepack-local", "wan2.1-1.3b-eval"]);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const win = evaluateWanForLearning({ platform: "win32", gpuVendor: "nvidia", vramGb: 16 });
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(win.defaultProfile.id, "svd-image-to-video");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(win.wanCandidate.id, "wan2.1-1.3b-eval");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.match(win.decision, /默认学习路径仍从 SVD\/FramePack 开始/);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const mac = evaluateWanForLearning({ platform: "darwin", gpuVendor: "apple", vramGb: 16 });
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(mac.wanCandidate, null);

// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(getVideoEvaluationProfile("wan2.1-14b-eval").recommendedVramGb, 24);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runDemo().day, 40);

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day40 tests passed");
