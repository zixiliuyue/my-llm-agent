// 学习目标：验证 CLI manifest 会校验环境、参数和输出契约，并脱敏调试信息。
import assert from "node:assert/strict";
import { createCliToolManifest, planCliInvocation, redactSensitiveText, validateToolRequest } from "../src/index.js";

const manifest = createCliToolManifest();
assert.ok(manifest.tools.some((item) => item.id === "host.search"));

const planned = planCliInvocation({
  toolId: "host.search",
  env: "sit",
  params: { keyword: "cmdb host" },
  debugHeaders: "Authorization=Bearer abc token=secret",
});
assert.equal(planned.status, "planned");
assert.ok(planned.commandPreview.includes("gre --env sit host search"));
assert.ok(planned.commandPreview.includes('"cmdb host"'));
assert.ok(planned.audit.debugHeaders.includes("<redacted>"));

const invalid = validateToolRequest({ toolId: "host.search", env: "qa", params: { keyword: "x" } }, manifest);
assert.equal(invalid.ok, false);
assert.equal(invalid.reason, "invalid-environment");

const blocked = planCliInvocation({ toolId: "chart.render", env: "sit", params: { dashboard: "NOC", baseUrl: "https://example.com" } });
assert.equal(blocked.status, "blocked");

assert.equal(redactSensitiveText("password=abc client_secret=xyz"), "password=<redacted> client_secret=<redacted>");

console.log("day50 tests passed");
