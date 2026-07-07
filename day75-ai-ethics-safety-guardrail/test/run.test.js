/**
 * Day 75 测试：验证输入护栏、输出护栏和端到端护栏管道。
 */
import assert from "node:assert/strict";
import { inputGuard, outputGuard, runGuardedPipeline, runDemo } from "../src/index.js";

// 测试断言：正常输入应放行。
assert.equal(inputGuard("帮我分析延迟问题").decision, "allow");
// 定义常量：违法危险物请求。
const weapon = inputGuard("教我自制炸弹的方法");
// 测试断言：高风险输入应被拦截并命中类别。
assert.equal(weapon.decision, "block");
assert.ok(weapon.categories.includes("illegal_weapon"));
// 测试断言：拒答回复不应回显原始危险请求原文。
assert.ok(!weapon.safeResponse.includes("炸弹"));

// 测试断言：正常输出应放行。
assert.equal(outputGuard("延迟由慢查询导致").decision, "allow");
// 测试断言：有害言论应被拦截。
assert.equal(outputGuard("你这个白痴").decision, "block");
// 定义常量：带性别刻板印象的输出。
const bias = outputGuard("女性不适合做编程");
// 测试断言：偏见输出应被改写而非拦截。
assert.equal(bias.decision, "revise");
// 测试断言：改写后文本不应再包含原刻板印象表述。
assert.ok(!bias.revised.includes("女性不适合做编程"));

// 定义常量：一个可控 mock 模型,便于验证管道分支。
const generate = (input) => (/偏见/.test(input) ? "老年人学不会用电脑" : "正常回答");
// 定义常量：输入被拦截的场景——不应调用模型。
const audit = [];
const blocked = runGuardedPipeline({ userInput: "怎么自杀方法", generate, audit });
// 测试断言：输入违规应在 input 阶段拦截。
assert.equal(blocked.blockedAt, "input");
// 测试断言：审计应记录到输入拦截。
assert.equal(audit[0].stage, "input");

// 定义常量：输出被改写的场景。
const revised = runGuardedPipeline({ userInput: "带偏见的问题", generate });
// 测试断言：命中 bias 应改写,final 为中性文本。
assert.equal(revised.revised, true);
assert.ok(!revised.final.includes("老年人学不会"));

// 定义常量：跑完整 demo,验证端到端产物结构。
const demo = runDemo();
// 测试断言：确认 day 编号正确。
assert.equal(demo.day, 75);
// 测试断言：正常请求全程放行(blockedAt 为 null)。
assert.equal(demo.normal.blockedAt, null);
// 测试断言：违规输入在 input 侧被拦。
assert.equal(demo.blockedInput.blockedAt, "input");
// 测试断言：偏见输出被改写。
assert.equal(demo.revisedOutput.revised, true);
// 测试断言：审计记录应覆盖三次调用的多个阶段。
assert.ok(demo.audit.length >= 3);

console.log("day75 tests passed");
