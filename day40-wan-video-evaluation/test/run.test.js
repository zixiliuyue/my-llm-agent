/**
 * Day 40：自包含学习源码。
 *
 * 这个文件属于 day40-wan-video-evaluation，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证 Wan 只进入评估清单，不成为 16G 显存默认视频路径。
import assert from "node:assert/strict";
import { evaluateWanForLearning, getVideoEvaluationProfile, rankVideoOptions, runDemo } from "../src/index.js";

const winRanked = rankVideoOptions({ platform: "win32", gpuVendor: "nvidia", vramGb: 16 }).map((item) => item.id);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.deepEqual(winRanked, ["svd-image-to-video", "framepack-local", "wan2.1-1.3b-eval"]);

const win = evaluateWanForLearning({ platform: "win32", gpuVendor: "nvidia", vramGb: 16 });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(win.defaultProfile.id, "svd-image-to-video");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(win.wanCandidate.id, "wan2.1-1.3b-eval");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.match(win.decision, /默认学习路径仍从 SVD\/FramePack 开始/);

const mac = evaluateWanForLearning({ platform: "darwin", gpuVendor: "apple", vramGb: 16 });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(mac.wanCandidate, null);

// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(getVideoEvaluationProfile("wan2.1-14b-eval").recommendedVramGb, 24);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runDemo().day, 40);

console.log("day40 tests passed");
