/**
 * Day 64 测试：验证 fallback、streaming、JSON schema、tool calling、rate limit 和统计。
 */
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createMockProvider, createModelRouter, loadProviderConfig, runDemo } from "../src/index.js";

// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(loadProviderConfig({ OLLAMA_MODEL: "qwen2.5-coder:14b" }).ollama.model, "qwen2.5-coder:14b");

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const router = createModelRouter({
  providers: [
    createMockProvider({ name: "openai", model: "mock-a", capabilities: ["chat"], priority: 1, failTimes: 1 }),
    createMockProvider({ name: "ollama", model: "mock-b", capabilities: ["chat", "streaming", "json_schema", "tool_calling"], priority: 2, response: "ok" }),
  ],
  maxRetries: 0,
  timeoutMs: 100,
});

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const completion = await router.complete({ prompt: "hello" });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(completion.provider, "ollama");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(router.stats().fallbacks, 1);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const structured = await router.json({
  prompt: "json",
  schema: { required: ["answer"], properties: { answer: { type: "string" }, confidence: { type: "number" } } },
});
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(structured.validation.ok, true);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const stream = await router.stream({ prompt: "hello stream" });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.ok(stream.result.content.length > 0);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const tool = await router.toolCall({ toolName: "search", arguments: { q: "agent" } });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(tool.result.toolName, "search");

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const rateLimited = createModelRouter({
  providers: [createMockProvider({ name: "mock", model: "m", capabilities: ["chat"], rateLimit: 0 })],
  maxRetries: 0,
});
// 等待异步操作完成：下一行代码依赖这个结果。
await assert.rejects(() => rateLimited.complete({ prompt: "x" }), /所有 provider 失败/);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const timeout = createModelRouter({
  providers: [createMockProvider({ name: "mock", model: "m", capabilities: ["chat"], delayMs: 1000 })],
  timeoutMs: 1,
  maxRetries: 0,
});
// 等待异步操作完成：下一行代码依赖这个结果。
await assert.rejects(() => timeout.complete({ prompt: "x" }), /所有 provider 失败/);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const demo = await runDemo();
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.day, 64);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.completion.provider, "ollama");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.structured.validation.ok, true);

// 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day64 tests passed");
