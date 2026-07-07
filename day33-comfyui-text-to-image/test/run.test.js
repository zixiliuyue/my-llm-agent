/**
 * Day 33：自包含学习源码。
 *
 * 这个文件属于 day33-comfyui-text-to-image，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：用 mock fetch 验证 ComfyUI adapter，不依赖真实图片模型。
import assert from "node:assert/strict";
import {
  createComfyClient,
  createDemoWorkflow,
  extractOutputImages,
  runDemo,
} from "../src/index.js";

const calls = [];
const fetchImpl = async (url, options = {}) => {
  calls.push({ url: url.toString(), options });
  if (url.toString().includes("/prompt")) {
    return { ok: true, json: async () => ({ prompt_id: "p1" }) };
  }
  return {
    ok: true,
    json: async () => ({
      p1: { outputs: { "2": { images: [{ filename: "day33.png", type: "output" }] } } },
    }),
  };
};

const client = createComfyClient({ host: "http://127.0.0.1:8188", fetchImpl });
const queued = await client.queuePrompt(createDemoWorkflow("local test"), "client-a");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(queued.prompt_id, "p1");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.match(calls[0].url, /\/prompt$/);

const history = await client.getHistory("p1");
const images = extractOutputImages(history, "p1");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(images[0].filename, "day33.png");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.match(client.viewImageUrl(images[0]), /\/view\?filename=day33.png/);

// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runDemo().localOnly, true);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.throws(() => createComfyClient({ host: "https://example.com", fetchImpl }), /must be local/);

console.log("day33 tests passed");
