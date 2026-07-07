/**
 * Day 64 测试：验证 fallback、streaming、JSON schema、tool calling、rate limit 和统计。
 */
import assert from "node:assert/strict";
import { createMockProvider, createModelRouter, loadProviderConfig, runDemo } from "../src/index.js";

// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(loadProviderConfig({ OLLAMA_MODEL: "qwen2.5-coder:14b" }).ollama.model, "qwen2.5-coder:14b");

const router = createModelRouter({
  providers: [
    createMockProvider({ name: "openai", model: "mock-a", capabilities: ["chat"], priority: 1, failTimes: 1 }),
    createMockProvider({ name: "ollama", model: "mock-b", capabilities: ["chat", "streaming", "json_schema", "tool_calling"], priority: 2, response: "ok" }),
  ],
  maxRetries: 0,
  timeoutMs: 100,
});

const completion = await router.complete({ prompt: "hello" });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(completion.provider, "ollama");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(router.stats().fallbacks, 1);

const structured = await router.json({
  prompt: "json",
  schema: { required: ["answer"], properties: { answer: { type: "string" }, confidence: { type: "number" } } },
});
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(structured.validation.ok, true);

const stream = await router.stream({ prompt: "hello stream" });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.ok(stream.result.content.length > 0);

const tool = await router.toolCall({ toolName: "search", arguments: { q: "agent" } });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(tool.result.toolName, "search");

const rateLimited = createModelRouter({
  providers: [createMockProvider({ name: "mock", model: "m", capabilities: ["chat"], rateLimit: 0 })],
  maxRetries: 0,
});
await assert.rejects(() => rateLimited.complete({ prompt: "x" }), /所有 provider 失败/);

const timeout = createModelRouter({
  providers: [createMockProvider({ name: "mock", model: "m", capabilities: ["chat"], delayMs: 1000 })],
  timeoutMs: 1,
  maxRetries: 0,
});
await assert.rejects(() => timeout.complete({ prompt: "x" }), /所有 provider 失败/);

const demo = await runDemo();
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.day, 64);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.completion.provider, "ollama");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.structured.validation.ok, true);

console.log("day64 tests passed");
