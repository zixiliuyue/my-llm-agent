/**
 * Day 66 测试：验证代码检查、VM 超时、Docker dry-run 和阻断策略。
 */
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { buildDockerSandboxSpec, defaultPolicy, executeUntrustedCode, inspectCode, runDemo, runJavaScriptVm } from "../src/index.js";

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const policy = defaultPolicy();
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(inspectCode({ language: "javascript", code: "1 + 1" }, policy).allowed, true);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(inspectCode({ language: "javascript", code: "require('fs')" }, policy).allowed, false);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(inspectCode({ language: "ruby", code: "puts 1" }, policy).allowed, false);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const spec = buildDockerSandboxSpec({ language: "python", code: "print(1)" }, policy);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(spec.dryRun, true);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(spec.isolation.network, "none");

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const vmResult = runJavaScriptVm("console.log('hello'); 6 * 7", policy);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(vmResult.ok, true);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.deepEqual(vmResult.output, ["hello"]);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(vmResult.value, 42);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const timeout = runJavaScriptVm("while (true) {}", { ...policy, timeoutMs: 20 });
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(timeout.ok, false);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.match(timeout.error, /timed out/);

// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(executeUntrustedCode({ language: "javascript", code: "process.exit()" }, policy).status, "blocked");
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(executeUntrustedCode({ language: "python", code: "print(1)" }, policy).status, "docker-dry-run");

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const demo = runDemo();
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.day, 66);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.blockedJavaScript.status, "blocked");

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day66 tests passed");
