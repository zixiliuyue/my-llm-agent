/**
 * Day 65 测试：验证图片、语音、视频 mock adapter 和多模态 eval。
 */
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createMockMultimodalAdapter, evaluateMultimodalUnderstanding, extractKeyframes, inspectMediaAsset, runDemo, scoreImageQuality } from "../src/index.js";

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const quality = scoreImageQuality({ blur: 0.1, brightness: 0.7, textCoverage: 0.4 });
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(quality.usableForEval, true);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.ok(quality.score > 0.8);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const adapter = createMockMultimodalAdapter();
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const image = inspectMediaAsset({
  mediaType: "image",
  ocrText: "contact dev@example.com",
  nsfw: false,
}, adapter);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.match(image.ocrText, /\[REDACTED:email\]/);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(image.exifRemoved, true);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const noisyAudio = inspectMediaAsset({ mediaType: "audio", transcript: "hello", noiseDb: 70 }, adapter);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(noisyAudio.quality, "noisy");

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const frames = extractKeyframes({ durationSec: 9 }, 3);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.deepEqual(frames.map((frame) => frame.timestampSec), [2.25, 4.5, 6.75]);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const video = inspectMediaAsset({ mediaType: "video", durationSec: 9 }, adapter);
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const evaluation = evaluateMultimodalUnderstanding([image, inspectMediaAsset({ mediaType: "audio", transcript: "clear", noiseDb: 20 }, adapter), video]);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(evaluation.passed, true);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const failed = evaluateMultimodalUnderstanding([noisyAudio]);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(failed.passed, false);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const demo = runDemo();
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.day, 65);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.evaluation.passed, true);

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day65 tests passed");
