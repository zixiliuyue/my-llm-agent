/**
 * Day 65 测试：验证图片、语音、视频 mock adapter 和多模态 eval。
 */
import assert from "node:assert/strict";
import { createMockMultimodalAdapter, evaluateMultimodalUnderstanding, extractKeyframes, inspectMediaAsset, runDemo, scoreImageQuality } from "../src/index.js";

const quality = scoreImageQuality({ blur: 0.1, brightness: 0.7, textCoverage: 0.4 });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(quality.usableForEval, true);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.ok(quality.score > 0.8);

const adapter = createMockMultimodalAdapter();
const image = inspectMediaAsset({
  mediaType: "image",
  ocrText: "contact dev@example.com",
  nsfw: false,
}, adapter);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.match(image.ocrText, /\[REDACTED:email\]/);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(image.exifRemoved, true);

const noisyAudio = inspectMediaAsset({ mediaType: "audio", transcript: "hello", noiseDb: 70 }, adapter);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(noisyAudio.quality, "noisy");

const frames = extractKeyframes({ durationSec: 9 }, 3);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.deepEqual(frames.map((frame) => frame.timestampSec), [2.25, 4.5, 6.75]);

const video = inspectMediaAsset({ mediaType: "video", durationSec: 9 }, adapter);
const evaluation = evaluateMultimodalUnderstanding([image, inspectMediaAsset({ mediaType: "audio", transcript: "clear", noiseDb: 20 }, adapter), video]);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(evaluation.passed, true);

const failed = evaluateMultimodalUnderstanding([noisyAudio]);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(failed.passed, false);

const demo = runDemo();
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.day, 65);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.evaluation.passed, true);

console.log("day65 tests passed");
