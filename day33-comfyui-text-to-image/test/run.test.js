/**
 * Day 33：自包含学习源码。
 *
 * 这个文件属于 day33-comfyui-text-to-image，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：用 mock fetch 验证 ComfyUI adapter，不依赖真实图片模型。
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import {
  createComfyClient,
  createDemoWorkflow,
  extractOutputImages,
  runDemo,
} from "../src/index.js";

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const calls = [];
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const fetchImpl = async (url, options = {}) => {
  calls.push({ url: url.toString(), options });
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (url.toString().includes("/prompt")) {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return { ok: true, json: async () => ({ prompt_id: "p1" }) };
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    ok: true,
    json: async () => ({
      p1: { outputs: { "2": { images: [{ filename: "day33.png", type: "output" }] } } },
    }),
  };
};

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const client = createComfyClient({ host: "http://127.0.0.1:8188", fetchImpl });
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const queued = await client.queuePrompt(createDemoWorkflow("local test"), "client-a");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(queued.prompt_id, "p1");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.match(calls[0].url, /\/prompt$/);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const history = await client.getHistory("p1");
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const images = extractOutputImages(history, "p1");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(images[0].filename, "day33.png");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.match(client.viewImageUrl(images[0]), /\/view\?filename=day33.png/);

// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runDemo().localOnly, true);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.throws(() => createComfyClient({ host: "https://example.com", fetchImpl }), /must be local/);

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day33 tests passed");
