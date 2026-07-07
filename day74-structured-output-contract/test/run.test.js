/**
 * Day 74 测试：验证 schema 校验、工具参数校验和自动修复回路。
 */
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { validateSchema, validateToolCall, buildRepairPrompt, produceWithRepair, runDemo } from "../src/index.js";

// 定义常量：一个对象契约,用于基础校验。
const schema = {
  type: "object",
  required: ["level"],
  properties: {
    level: { type: "string", enum: ["low", "high"] },
    count: { type: "number", minimum: 0, maximum: 10 },
  },
};

// 测试断言：合法对象应通过校验。
assert.equal(validateSchema({ level: "low", count: 3 }, schema).ok, true);
// 定义常量：非法对象(枚举错 + 超上界)。
const bad = validateSchema({ level: "mid", count: 99 }, schema);
// 测试断言：非法对象应校验失败,并收集到 2 条错误。
assert.equal(bad.ok, false);
assert.equal(bad.errors.length, 2);
// 定义常量：缺必填字段的对象。
const missing = validateSchema({ count: 1 }, schema);
// 测试断言：缺 required 字段应报错并带字段路径。
assert.equal(missing.errors[0].path, "$.level");

// 定义常量：数组元素类型校验。
const arrSchema = { type: "array", items: { type: "string" } };
// 测试断言：数组里混入数字应报错。
assert.equal(validateSchema(["a", 1], arrSchema).ok, false);

// 定义常量：工具声明,用于 function-calling 参数校验。
const tool = { name: "t", parameters: { type: "object", required: ["x"], properties: { x: { type: "number", minimum: 1 } } } };
// 测试断言：合法入参 callable 为真。
assert.equal(validateToolCall({ tool, args: { x: 5 } }).callable, true);
// 测试断言：非法入参(小于下界)不可调用。
assert.equal(validateToolCall({ tool, args: { x: 0 } }).callable, false);

// 定义常量：修复提示应包含错误字段路径。
const prompt = buildRepairPrompt([{ path: "$.level", message: "必填字段缺失" }]);
// 测试断言：修复提示里应出现字段路径,便于模型定向修复。
assert.ok(prompt.includes("$.level"));

// 定义变量：模拟第一次坏、第二次好的模型,验证自动修复回路。
let n = 0;
const repaired = produceWithRepair({
  schema,
  producer: (rp) => {
    n += 1;
    // 条件判断：首轮无修复提示时故意给非法值。
    return rp ? { level: "high", count: 2 } : { level: "bad" };
  },
});
// 测试断言：经过一次修复后应成功,且用了 2 轮。
assert.equal(repaired.ok, true);
assert.equal(repaired.rounds, 2);
assert.equal(repaired.attempts[0].ok, false);
assert.equal(repaired.attempts[1].ok, true);

// 定义常量：始终产出非法值的模型,验证重试用尽后失败。
const failed = produceWithRepair({ schema, producer: () => ({ level: "x" }), maxRetries: 1 });
// 测试断言：重试用尽仍不合法应返回 ok=false,交给上层兜底。
assert.equal(failed.ok, false);
assert.equal(failed.rounds, 2);

// 定义常量：跑完整 demo,验证端到端产物结构。
const demo = runDemo();
// 测试断言：确认 day 编号正确。
assert.equal(demo.day, 74);
// 测试断言：demo 修复回路应最终成功。
assert.equal(demo.repaired.ok, true);
// 测试断言：非法工具调用不可执行,合法的可执行。
assert.equal(demo.toolCalls.badCall.callable, false);
assert.equal(demo.toolCalls.goodCall.callable, true);

// 输出到 stdout：这里是命令的正式结果,方便脚本继续处理。
console.log("day74 tests passed");
