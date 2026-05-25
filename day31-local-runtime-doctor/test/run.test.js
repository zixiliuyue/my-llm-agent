// 学习目标：验证环境检测只读、可 mock，并且拒绝远程模型地址。
import assert from "node:assert/strict";
import { inspectLocalRuntime, isLocalHttpUrl, runDemo } from "../src/index.js";

const demo = runDemo({
  platform: "win32",
  arch: "x64",
  nodeVersion: "22.0.0",
  pythonVersion: "3.11.9",
  gpu: { vendor: "nvidia", name: "RTX 5060 Ti", vramGb: 16 },
});

assert.equal(demo.day, 31);
assert.equal(demo.report.localOnly, true);
assert.equal(demo.report.autoInstall, false);
assert.equal(demo.report.ok, true);
assert.equal(isLocalHttpUrl("http://127.0.0.1:11434"), true);
assert.equal(isLocalHttpUrl("https://api.example.com"), false);

const remote = inspectLocalRuntime({ ...demo.input, ollamaHost: "https://api.example.com" });
assert.equal(remote.ok, false);
assert.equal(remote.checks.find((item) => item.id === "ollama-host").status, "error");

console.log("day31 tests passed");
