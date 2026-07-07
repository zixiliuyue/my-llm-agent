/**
 * Day 36：自包含学习源码。
 *
 * 这个文件属于 day36-local-image-assets，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
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
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(record.localOnly, true);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(record.outputPath, "outputs/a.png");

const parsed = parseAssets(serializeAssets([record]));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(parsed[0].prompt, "local image");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(filterAssetsByModel(parsed, "flux-schnell").length, 1);

// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(assertLocalAssetPath("file:///C:/images/a.png"), "file:///C:/images/a.png");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.throws(() => assertLocalAssetPath("https://cdn.example.com/a.png"), /must be local/);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.throws(() => assertLocalAssetPath("../outside.png"), /workspace/);

console.log("day36 tests passed");
