/**
 * Day 53：自包含学习源码。
 *
 * 这个文件属于 day53-database-fix-sql-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：生成可 review 的 SQL 和回滚 SQL，不连接数据库、不执行变更。
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const ALLOWED_TABLES = new Set(["project", "grafana_dashboard", "permission"]);
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const ALLOWED_COLUMNS = new Set(["name", "display_name", "status", "description"]);

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function quote(value) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return `'${String(value).replace(/'/g, "''")}'`;
}

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function ensureSafeIdentifier(value, allowed) {
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!allowed.has(value)) {
    // 教学：抛出错误：让调用方知道当前流程不能继续。
    throw new Error(`unsupported identifier: ${value}`);
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return value;
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createMockSqlFixRequest(overrides = {}) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    table: overrides.table ?? "project",
    idColumn: overrides.idColumn ?? "id",
    ids: overrides.ids ?? [156, 174],
    column: overrides.column ?? "name",
    oldValue: overrides.oldValue ?? "alertmanager",
    newValue: overrides.newValue ?? "prometheus",
    reason: overrides.reason ?? "修正项目展示名称",
  };
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function buildSqlFixPlan(request = createMockSqlFixRequest()) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const table = ensureSafeIdentifier(request.table, ALLOWED_TABLES);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const column = ensureSafeIdentifier(request.column, ALLOWED_COLUMNS);
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (request.idColumn !== "id") {
    // 教学：抛出错误：让调用方知道当前流程不能继续。
    throw new Error("only id column is supported in teaching plan");
  }
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!Array.isArray(request.ids) || request.ids.length === 0 || !request.ids.every((id) => Number.isInteger(id))) {
    // 教学：抛出错误：让调用方知道当前流程不能继续。
    throw new Error("ids must be non-empty integers");
  }

  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const idList = request.ids.join(", ");
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const selectSql = `SELECT id, ${column} FROM ${table} WHERE id IN (${idList}) FOR UPDATE;`;
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const updateSql = `UPDATE ${table} SET ${column} = ${quote(request.newValue)} WHERE id IN (${idList}) AND ${column} = ${quote(request.oldValue)};`;
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const rollbackSql = `UPDATE ${table} SET ${column} = ${quote(request.oldValue)} WHERE id IN (${idList}) AND ${column} = ${quote(request.newValue)};`;

  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 53,
    title: "数据库修复 SQL 生成 Agent",
    localOnly: true,
    executableByAgent: false,
    reason: request.reason,
    risk: [
      "必须在人工确认的事务中执行。",
      "执行前先确认 SELECT FOR UPDATE 返回行数和旧值。",
      "Agent 只生成 SQL，不连接数据库、不执行变更。",
    ],
    sql: ["BEGIN;", selectSql, updateSql, "COMMIT;"].join("\n"),
    rollbackSql: ["BEGIN;", selectSql, rollbackSql, "COMMIT;"].join("\n"),
  };
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo() {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return buildSqlFixPlan(createMockSqlFixRequest());
}
