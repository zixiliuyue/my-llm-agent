/**
 * Day 31：自包含学习源码。
 *
 * 这个文件属于 day31-local-runtime-doctor，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证环境检测只读、可 mock，并且拒绝远程模型地址。
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { inspectLocalRuntime, isLocalHttpUrl, runDemo } from "../src/index.js";

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const demo = runDemo({
  platform: "win32",
  arch: "x64",
  nodeVersion: "22.0.0",
  pythonVersion: "3.11.9",
  gpu: { vendor: "nvidia", name: "RTX 5060 Ti", vramGb: 16 },
});

// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(demo.day, 31);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(demo.report.localOnly, true);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(demo.report.autoInstall, false);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(demo.report.ok, true);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(isLocalHttpUrl("http://127.0.0.1:11434"), true);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(isLocalHttpUrl("https://api.example.com"), false);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const remote = inspectLocalRuntime({ ...demo.input, ollamaHost: "https://api.example.com" });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(remote.ok, false);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(remote.checks.find((item) => item.id === "ollama-host").status, "error");

// 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day31 tests passed");
