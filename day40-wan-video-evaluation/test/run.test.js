// 学习目标：验证 Wan 只进入评估清单，不成为 16G 显存默认视频路径。
import assert from "node:assert/strict";
import { evaluateWanForLearning, getVideoEvaluationProfile, rankVideoOptions, runDemo } from "../src/index.js";

const winRanked = rankVideoOptions({ platform: "win32", gpuVendor: "nvidia", vramGb: 16 }).map((item) => item.id);
assert.deepEqual(winRanked, ["svd-image-to-video", "framepack-local", "wan2.1-1.3b-eval"]);

const win = evaluateWanForLearning({ platform: "win32", gpuVendor: "nvidia", vramGb: 16 });
assert.equal(win.defaultProfile.id, "svd-image-to-video");
assert.equal(win.wanCandidate.id, "wan2.1-1.3b-eval");
assert.match(win.decision, /默认学习路径仍从 SVD\/FramePack 开始/);

const mac = evaluateWanForLearning({ platform: "darwin", gpuVendor: "apple", vramGb: 16 });
assert.equal(mac.wanCandidate, null);

assert.equal(getVideoEvaluationProfile("wan2.1-14b-eval").recommendedVramGb, 24);
assert.equal(runDemo().day, 40);

console.log("day40 tests passed");
