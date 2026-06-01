/**
 * Day 32：自包含学习源码。
 *
 * 这个文件属于 day32-local-provider-router，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证 provider 路由只接受本地服务。
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createLocalProviderRegistry, runDemo, selectProvider } from "../src/index.js";

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const demo = runDemo();
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(demo.day, 32);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(demo.routes.text, "ollama:text");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(demo.routes.image, "comfy:image");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(demo.routes.video, "framepack:video");

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const registry = createLocalProviderRegistry({ comfyuiHost: "http://localhost:8188" });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(selectProvider("image", registry).endpoint, "http://localhost:8188");

// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.throws(
  () => createLocalProviderRegistry({ ollamaHost: "https://api.openai.com" }),
  /must be local/
);

// 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day32 tests passed");
