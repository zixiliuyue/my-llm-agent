// 学习目标：生成可 review 的 SQL 和回滚 SQL，不连接数据库、不执行变更。
const ALLOWED_TABLES = new Set(["project", "grafana_dashboard", "permission"]);
const ALLOWED_COLUMNS = new Set(["name", "display_name", "status", "description"]);

function quote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function ensureSafeIdentifier(value, allowed) {
  if (!allowed.has(value)) {
    throw new Error(`unsupported identifier: ${value}`);
  }
  return value;
}

export function createMockSqlFixRequest(overrides = {}) {
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

export function buildSqlFixPlan(request = createMockSqlFixRequest()) {
  const table = ensureSafeIdentifier(request.table, ALLOWED_TABLES);
  const column = ensureSafeIdentifier(request.column, ALLOWED_COLUMNS);
  if (request.idColumn !== "id") {
    throw new Error("only id column is supported in teaching plan");
  }
  if (!Array.isArray(request.ids) || request.ids.length === 0 || !request.ids.every((id) => Number.isInteger(id))) {
    throw new Error("ids must be non-empty integers");
  }

  const idList = request.ids.join(", ");
  const selectSql = `SELECT id, ${column} FROM ${table} WHERE id IN (${idList}) FOR UPDATE;`;
  const updateSql = `UPDATE ${table} SET ${column} = ${quote(request.newValue)} WHERE id IN (${idList}) AND ${column} = ${quote(request.oldValue)};`;
  const rollbackSql = `UPDATE ${table} SET ${column} = ${quote(request.oldValue)} WHERE id IN (${idList}) AND ${column} = ${quote(request.newValue)};`;

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

export function runDemo() {
  return buildSqlFixPlan(createMockSqlFixRequest());
}
