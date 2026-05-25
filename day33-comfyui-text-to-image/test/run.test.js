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
assert.equal(queued.prompt_id, "p1");
assert.match(calls[0].url, /\/prompt$/);

const history = await client.getHistory("p1");
const images = extractOutputImages(history, "p1");
assert.equal(images[0].filename, "day33.png");
assert.match(client.viewImageUrl(images[0]), /\/view\?filename=day33.png/);

assert.equal(runDemo().localOnly, true);
assert.throws(() => createComfyClient({ host: "https://example.com", fetchImpl }), /must be local/);

console.log("day33 tests passed");
