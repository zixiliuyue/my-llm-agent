/**
 * Day 37：自包含学习源码。
 *
 * 这个文件属于 day37-flux-or-sdxl-profile，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证 16G Windows 推荐保守模型，不把大模型设成默认。
import assert from "node:assert/strict";
import { getImageModelProfile, recommendImageProfile, runDemo } from "../src/index.js";

// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(getImageModelProfile("sdxl-base").minVramGb, 8);

const win = recommendImageProfile({ platform: "win32", gpuVendor: "nvidia", vramGb: 16 });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(win.defaultProfile.id, "sdxl-base");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(win.advancedProfile.id, "flux-schnell");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.match(win.note, /FLUX\.1 schnell/);

const mac = recommendImageProfile({ platform: "darwin", gpuVendor: "apple", vramGb: 16 });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(mac.defaultProfile.id, "sdxl-base");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(mac.advancedProfile, null);

// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runDemo().day, 37);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.throws(() => getImageModelProfile("flux-32b"), /unknown/);

console.log("day37 tests passed");
