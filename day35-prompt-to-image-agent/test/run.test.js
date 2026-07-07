/**
 * Day 35：自包含学习源码。
 *
 * 这个文件属于 day35-prompt-to-image-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证文本模型只负责 prompt 优化，图片生成交给本地 provider。
import assert from "node:assert/strict";
import {
  buildOllamaPromptRequest,
  optimizeImagePrompt,
  parseOllamaPromptResponse,
  runDemo,
} from "../src/index.js";

const optimized = optimizeImagePrompt({ userText: "一个本地 agent 控制台", style: "product" });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.match(optimized.positivePrompt, /本地 agent/);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(optimized.handoff.provider, "comfy:image");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(optimized.handoff.localOnly, true);

const request = buildOllamaPromptRequest({ userText: "测试", model: "qwen2.5:7b" });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(request.model, "qwen2.5:7b");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(request.stream, false);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(request.format, "json");

const parsed = parseOllamaPromptResponse(
  // 处理 JSON：把对象和字符串互相转换，便于协议传输或断言。
  { message: { content: JSON.stringify({ positivePrompt: "local prompt", workflowProfile: "flux-schnell" }) } },
  { userText: "fallback" }
);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(parsed.positivePrompt, "local prompt");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(parsed.handoff.workflowProfile, "flux-schnell");

// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runDemo().day, 35);

console.log("day35 tests passed");
