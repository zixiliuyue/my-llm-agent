// 学习目标：验证文本模型只负责 prompt 优化，图片生成交给本地 provider。
import assert from "node:assert/strict";
import {
  buildOllamaPromptRequest,
  optimizeImagePrompt,
  parseOllamaPromptResponse,
  runDemo,
} from "../src/index.js";

const optimized = optimizeImagePrompt({ userText: "一个本地 agent 控制台", style: "product" });
assert.match(optimized.positivePrompt, /本地 agent/);
assert.equal(optimized.handoff.provider, "comfy:image");
assert.equal(optimized.handoff.localOnly, true);

const request = buildOllamaPromptRequest({ userText: "测试", model: "qwen2.5:7b" });
assert.equal(request.model, "qwen2.5:7b");
assert.equal(request.stream, false);
assert.equal(request.format, "json");

const parsed = parseOllamaPromptResponse(
  { message: { content: JSON.stringify({ positivePrompt: "local prompt", workflowProfile: "flux-schnell" }) } },
  { userText: "fallback" }
);
assert.equal(parsed.positivePrompt, "local prompt");
assert.equal(parsed.handoff.workflowProfile, "flux-schnell");

assert.equal(runDemo().day, 35);

console.log("day35 tests passed");
