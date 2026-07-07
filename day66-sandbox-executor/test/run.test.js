/**
 * Day 66 测试：验证代码检查、VM 超时、Docker dry-run 和阻断策略。
 */
import assert from "node:assert/strict";
import { buildDockerSandboxSpec, defaultPolicy, executeUntrustedCode, inspectCode, runDemo, runJavaScriptVm } from "../src/index.js";

const policy = defaultPolicy();
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(inspectCode({ language: "javascript", code: "1 + 1" }, policy).allowed, true);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(inspectCode({ language: "javascript", code: "require('fs')" }, policy).allowed, false);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(inspectCode({ language: "ruby", code: "puts 1" }, policy).allowed, false);

const spec = buildDockerSandboxSpec({ language: "python", code: "print(1)" }, policy);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(spec.dryRun, true);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(spec.isolation.network, "none");

const vmResult = runJavaScriptVm("console.log('hello'); 6 * 7", policy);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(vmResult.ok, true);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.deepEqual(vmResult.output, ["hello"]);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(vmResult.value, 42);

const timeout = runJavaScriptVm("while (true) {}", { ...policy, timeoutMs: 20 });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(timeout.ok, false);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.match(timeout.error, /timed out/);

// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(executeUntrustedCode({ language: "javascript", code: "process.exit()" }, policy).status, "blocked");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(executeUntrustedCode({ language: "python", code: "print(1)" }, policy).status, "docker-dry-run");

const demo = runDemo();
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.day, 66);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.blockedJavaScript.status, "blocked");

console.log("day66 tests passed");
