// 学习目标：验证短视频第一步只接受本地图片并给出保守计划。
import assert from "node:assert/strict";
import { buildImageToVideoPlan, parseSize, recommendVideoFirstStep, runDemo } from "../src/index.js";

assert.deepEqual(parseSize("576x1024"), { width: 576, height: 1024 });

const plan = buildImageToVideoPlan({ sourceImage: "outputs/a.png", frames: 12, size: "512x512" });
assert.equal(plan.localOnly, true);
assert.equal(plan.estimatedLoad, "medium");

const win = recommendVideoFirstStep({ platform: "win32", gpuVendor: "nvidia", vramGb: 16 });
assert.equal(win.canTry, true);

const mac = recommendVideoFirstStep({ platform: "darwin", gpuVendor: "apple", vramGb: 16 });
assert.equal(mac.canTry, false);

assert.throws(() => buildImageToVideoPlan({ sourceImage: "https://example.com/a.png" }), /local image/);
assert.equal(runDemo().day, 38);

console.log("day38 tests passed");
