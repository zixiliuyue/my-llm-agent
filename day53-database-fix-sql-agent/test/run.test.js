/**
 * Day 53：自包含学习源码。
 *
 * 这个文件属于 day53-database-fix-sql-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证 SQL Agent 只生成安全可 review 的 SQL 和回滚 SQL，不执行数据库操作。
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { buildSqlFixPlan, createMockSqlFixRequest } from "../src/index.js";

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const plan = buildSqlFixPlan(createMockSqlFixRequest());
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(plan.executableByAgent, false);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(plan.sql.includes("SELECT id, name FROM project WHERE id IN (156, 174) FOR UPDATE;"));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(plan.sql.includes("UPDATE project SET name = 'prometheus'"));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(plan.rollbackSql.includes("UPDATE project SET name = 'alertmanager'"));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(plan.risk.some((item) => item.includes("不连接数据库")));

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const escaped = buildSqlFixPlan(createMockSqlFixRequest({
  oldValue: "team's-old",
  newValue: "team's-new",
}));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(escaped.sql.includes("'team''s-new'"));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(escaped.rollbackSql.includes("'team''s-old'"));

// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.throws(() => buildSqlFixPlan(createMockSqlFixRequest({ ids: [] })), /ids/);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.throws(() => buildSqlFixPlan(createMockSqlFixRequest({ table: "users" })), /unsupported/);

// 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day53 tests passed");
