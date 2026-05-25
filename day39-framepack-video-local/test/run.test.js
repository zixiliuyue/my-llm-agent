// 学习目标：验证 FramePack 只作为本地 NVIDIA 视频 profile。
import assert from "node:assert/strict";
import { buildFramePackJob, evaluateFramePackReadiness, runDemo } from "../src/index.js";

const ready = evaluateFramePackReadiness({
  platform: "win32",
  gpuName: "NVIDIA GeForce RTX 5060 Ti",
  vramGb: 16,
  memoryGb: 32,
});
assert.equal(ready.ready, true);

const mac = evaluateFramePackReadiness({
  platform: "darwin",
  gpuName: "Apple M4",
  vramGb: 16,
  memoryGb: 32,
});
assert.equal(mac.ready, false);
assert.ok(mac.issues.length > 0);

const job = buildFramePackJob({ sourceImage: "outputs/a.png", prompt: "local video" });
assert.equal(job.provider, "framepack:video");
assert.equal(job.localOnly, true);

assert.throws(
  () => buildFramePackJob({ sourceImage: "outputs/a.png", prompt: "x", endpoint: "https://example.com" }),
  /must be local/
);
assert.equal(runDemo().day, 39);

console.log("day39 tests passed");
