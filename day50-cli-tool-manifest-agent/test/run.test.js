/**
 * Day 50：自包含学习源码。
 *
 * 这个文件属于 day50-cli-tool-manifest-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证 CLI manifest 会校验环境、参数和输出契约，并脱敏调试信息。
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createCliToolManifest, planCliInvocation, redactSensitiveText, validateToolRequest } from "../src/index.js";

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const manifest = createCliToolManifest();
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(manifest.tools.some((item) => item.id === "host.search"));

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const planned = planCliInvocation({
  toolId: "host.search",
  env: "sit",
  params: { keyword: "cmdb host" },
  debugHeaders: "Authorization=Bearer abc token=secret",
});
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(planned.status, "planned");
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(planned.commandPreview.includes("gre --env sit host search"));
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(planned.commandPreview.includes('"cmdb host"'));
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(planned.audit.debugHeaders.includes("<redacted>"));

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const invalid = validateToolRequest({ toolId: "host.search", env: "qa", params: { keyword: "x" } }, manifest);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(invalid.ok, false);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(invalid.reason, "invalid-environment");

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const blocked = planCliInvocation({ toolId: "chart.render", env: "sit", params: { dashboard: "NOC", baseUrl: "https://example.com" } });
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(blocked.status, "blocked");

// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(redactSensitiveText("password=abc client_secret=xyz"), "password=<redacted> client_secret=<redacted>");

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day50 tests passed");
