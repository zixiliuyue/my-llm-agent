// 学习目标：验证资产元数据只记录本地路径并可 JSONL 往返。
import assert from "node:assert/strict";
import {
  assertLocalAssetPath,
  createImageAssetRecord,
  filterAssetsByModel,
  parseAssets,
  serializeAssets,
} from "../src/index.js";

const record = createImageAssetRecord({
  prompt: "local image",
  outputPath: "outputs/a.png",
  model: "flux-schnell",
  seed: 42,
});
assert.equal(record.localOnly, true);
assert.equal(record.outputPath, "outputs/a.png");

const parsed = parseAssets(serializeAssets([record]));
assert.equal(parsed[0].prompt, "local image");
assert.equal(filterAssetsByModel(parsed, "flux-schnell").length, 1);

assert.equal(assertLocalAssetPath("file:///C:/images/a.png"), "file:///C:/images/a.png");
assert.throws(() => assertLocalAssetPath("https://cdn.example.com/a.png"), /must be local/);
assert.throws(() => assertLocalAssetPath("../outside.png"), /workspace/);

console.log("day36 tests passed");
