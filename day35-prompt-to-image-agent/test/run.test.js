/**
 * Day 35：自包含学习源码。
 *
 * 这个文件属于 day35-prompt-to-image-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证文本模型只负责 prompt 优化，图片生成交给本地 provider。
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import {
  buildOllamaPromptRequest,
  optimizeImagePrompt,
  parseOllamaPromptResponse,
  runDemo,
} from "../src/index.js";

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const optimized = optimizeImagePrompt({ userText: "一个本地 agent 控制台", style: "product" });
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.match(optimized.positivePrompt, /本地 agent/);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(optimized.handoff.provider, "comfy:image");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(optimized.handoff.localOnly, true);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const request = buildOllamaPromptRequest({ userText: "测试", model: "qwen2.5:7b" });
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(request.model, "qwen2.5:7b");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(request.stream, false);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(request.format, "json");

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const parsed = parseOllamaPromptResponse(
  // 教学：处理 JSON：把对象和字符串互相转换，便于协议传输或断言。
  { message: { content: JSON.stringify({ positivePrompt: "local prompt", workflowProfile: "flux-schnell" }) } },
  { userText: "fallback" }
);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(parsed.positivePrompt, "local prompt");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(parsed.handoff.workflowProfile, "flux-schnell");

// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runDemo().day, 35);

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day35 tests passed");
