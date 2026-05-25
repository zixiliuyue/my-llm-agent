// 学习目标：验证 16G Windows 推荐保守模型，不把大模型设成默认。
import assert from "node:assert/strict";
import { getImageModelProfile, recommendImageProfile, runDemo } from "../src/index.js";

assert.equal(getImageModelProfile("sdxl-base").minVramGb, 8);

const win = recommendImageProfile({ platform: "win32", gpuVendor: "nvidia", vramGb: 16 });
assert.equal(win.defaultProfile.id, "sdxl-base");
assert.equal(win.advancedProfile.id, "flux-schnell");
assert.match(win.note, /FLUX\.1 schnell/);

const mac = recommendImageProfile({ platform: "darwin", gpuVendor: "apple", vramGb: 16 });
assert.equal(mac.defaultProfile.id, "sdxl-base");
assert.equal(mac.advancedProfile, null);

assert.equal(runDemo().day, 37);
assert.throws(() => getImageModelProfile("flux-32b"), /unknown/);

console.log("day37 tests passed");
