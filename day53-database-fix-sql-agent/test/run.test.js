// 学习目标：验证 SQL Agent 只生成安全可 review 的 SQL 和回滚 SQL，不执行数据库操作。
import assert from "node:assert/strict";
import { buildSqlFixPlan, createMockSqlFixRequest } from "../src/index.js";

const plan = buildSqlFixPlan(createMockSqlFixRequest());
assert.equal(plan.executableByAgent, false);
assert.ok(plan.sql.includes("SELECT id, name FROM project WHERE id IN (156, 174) FOR UPDATE;"));
assert.ok(plan.sql.includes("UPDATE project SET name = 'prometheus'"));
assert.ok(plan.rollbackSql.includes("UPDATE project SET name = 'alertmanager'"));
assert.ok(plan.risk.some((item) => item.includes("不连接数据库")));

const escaped = buildSqlFixPlan(createMockSqlFixRequest({
  oldValue: "team's-old",
  newValue: "team's-new",
}));
assert.ok(escaped.sql.includes("'team''s-new'"));
assert.ok(escaped.rollbackSql.includes("'team''s-old'"));

assert.throws(() => buildSqlFixPlan(createMockSqlFixRequest({ ids: [] })), /ids/);
assert.throws(() => buildSqlFixPlan(createMockSqlFixRequest({ table: "users" })), /unsupported/);

console.log("day53 tests passed");
