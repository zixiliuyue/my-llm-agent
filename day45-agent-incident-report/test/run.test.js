/**
 * Day 45：自包含学习源码。
 *
 * 这个文件属于 day45-agent-incident-report，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证事故报告包含证据、时间线、审计和后续动作，并脱敏敏感字段。
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { buildActionItems, createIncidentReport, createMockIncidentContext, runDemo } from "../src/index.js";

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const context = createMockIncidentContext();
context.diagnosis.evidence.push("token=secret-value");
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const report = createIncidentReport(context);

// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.match(report, /## 证据/);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.match(report, /## 时间线/);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.match(report, /## 审计/);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.match(report, /token=<redacted>/);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.doesNotMatch(report, /secret-value/);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const actions = buildActionItems(context);
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(actions.some((item) => item.owner === "backend"));
// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(actions.some((item) => item.action.includes("权限拒绝")));

// 教学：测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runDemo().day, 45);

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day45 tests passed");
