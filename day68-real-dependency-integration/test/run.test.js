/**
 * Day 68 测试：验证 dotenv、schema 配置、compose 计划和集成测试计划。
 */
import assert from "node:assert/strict";
import { createComposePlan, createIntegrationTestPlan, loadConfig, parseDotenv, runDemo, validateConfig } from "../src/index.js";

// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.deepEqual(parseDotenv("A=1\n#x\nB=\"two\""), { A: "1", B: "two" });

const config = loadConfig({ env: { DEPENDENCY_MODE: "testcontainers", MINIO_BUCKET: "agent-artifacts" } });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(config.dependencyMode, "testcontainers");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.deepEqual(validateConfig(config), []);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.throws(() => loadConfig({ env: { POSTGRES_URL: "http://bad" } }), /配置错误/);

const compose = createComposePlan(config);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.ok(compose.services.some((service) => service.includes("postgres")));
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.ok(compose.healthChecks.length >= 3);

const plan = createIntegrationTestPlan(config);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(plan.mode, "testcontainers");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.ok(plan.assertions.some((item) => item.includes("Redis lease")));

const demo = runDemo();
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.day, 68);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.config.dependencyMode, "compose");

console.log("day68 tests passed");
