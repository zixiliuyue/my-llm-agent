// 学习目标：验证 provider 路由只接受本地服务。
import assert from "node:assert/strict";
import { createLocalProviderRegistry, runDemo, selectProvider } from "../src/index.js";

const demo = runDemo();
assert.equal(demo.day, 32);
assert.equal(demo.routes.text, "ollama:text");
assert.equal(demo.routes.image, "comfy:image");
assert.equal(demo.routes.video, "framepack:video");

const registry = createLocalProviderRegistry({ comfyuiHost: "http://localhost:8188" });
assert.equal(selectProvider("image", registry).endpoint, "http://localhost:8188");

assert.throws(
  () => createLocalProviderRegistry({ ollamaHost: "https://api.openai.com" }),
  /must be local/
);

console.log("day32 tests passed");
