/**
 * Day 68 测试：验证 dotenv、schema 配置、compose 计划和集成测试计划。
 */
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createComposePlan, createIntegrationTestPlan, loadConfig, parseDotenv, runDemo, validateConfig } from "../src/index.js";

// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.deepEqual(parseDotenv("A=1\n#x\nB=\"two\""), { A: "1", B: "two" });

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const config = loadConfig({ env: { DEPENDENCY_MODE: "testcontainers", MINIO_BUCKET: "agent-artifacts" } });
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(config.dependencyMode, "testcontainers");
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.deepEqual(validateConfig(config), []);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.throws(() => loadConfig({ env: { POSTGRES_URL: "http://bad" } }), /配置错误/);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const compose = createComposePlan(config);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.ok(compose.services.some((service) => service.includes("postgres")));
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.ok(compose.healthChecks.length >= 3);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const plan = createIntegrationTestPlan(config);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(plan.mode, "testcontainers");
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.ok(plan.assertions.some((item) => item.includes("Redis lease")));

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const demo = runDemo();
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.day, 68);
// 教学：测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.config.dependencyMode, "compose");

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day68 tests passed");
