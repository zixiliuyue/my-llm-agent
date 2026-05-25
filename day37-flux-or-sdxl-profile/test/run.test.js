/**
 * Day 37：自包含学习源码。
 *
 * 这个文件属于 day37-flux-or-sdxl-profile，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证 16G Windows 推荐保守模型，不把大模型设成默认。
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { getImageModelProfile, recommendImageProfile, runDemo } from "../src/index.js";

// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(getImageModelProfile("sdxl-base").minVramGb, 8);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const win = recommendImageProfile({ platform: "win32", gpuVendor: "nvidia", vramGb: 16 });
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(win.defaultProfile.id, "sdxl-base");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(win.advancedProfile.id, "flux-schnell");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.match(win.note, /FLUX\.1 schnell/);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const mac = recommendImageProfile({ platform: "darwin", gpuVendor: "apple", vramGb: 16 });
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(mac.defaultProfile.id, "sdxl-base");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(mac.advancedProfile, null);

// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runDemo().day, 37);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.throws(() => getImageModelProfile("flux-32b"), /unknown/);

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day37 tests passed");
