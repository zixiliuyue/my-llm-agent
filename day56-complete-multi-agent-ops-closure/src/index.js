/**
 * Day 56：自包含学习源码。
 *
 * 这个文件属于 day56-complete-multi-agent-ops-closure，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：把观测、权限、审批、SQL、MCP 和复盘质量串成完整多 Agent 工程闭环。
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const RETRO_REQUIRED_SECTIONS = ["timeline", "impact", "rootCause", "evidence", "fix", "prevention"];

// 教学：导出常量：其它文件可以 import 这个值，适合放默认配置或元信息。
export const CAPSTONE_AGENTS = [
  {
    id: "coordinator-agent",
    role: "拆分用户目标、维护 handoff 顺序、汇总最终审计结论。",
  },
  {
    id: "observability-agent",
    role: "判断 Grafana、Prometheus、日志和 trace 证据是否可信。",
  },
  {
    id: "permission-agent",
    role: "核验用户权限缓存、ACL snapshot 和真实用户身份。",
  },
  {
    id: "safety-agent",
    role: "判断远程命令应 blocked、pending approval 还是 dry-run。",
  },
  {
    id: "sql-agent",
    role: "只生成修复 SQL、回滚 SQL 和风险说明，不连接数据库。",
  },
  {
    id: "mcp-verifier-agent",
    role: "验证 /mcp、initialize 和 tools/list，不把 /health 或 /sse 当 MCP。",
  },
  {
    id: "retro-agent",
    role: "检查复盘是否包含时间线、影响面、根因、证据、修复、预防项和脱敏。",
  },
];

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function deepMerge(base, overrides = {}) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const output = Array.isArray(base) ? [...base] : { ...base };
  // 教学：循环：按顺序处理多条数据或多个步骤。
  for (const [key, value] of Object.entries(overrides)) {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const current = output[key];
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      current &&
      typeof current === "object" &&
      !Array.isArray(current)
    ) {
      output[key] = deepMerge(current, value);
    } else {
      output[key] = value;
    }
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return output;
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createMockCapstoneInput(overrides = {}) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const base = {
    runId: "day56-mock-run-001",
    goal: "排查配置中心发布后查询变慢，生成人工可审计修复建议。",
    incidentId: "INC-2026-0525-056",
    observability: {
      grafana: {
        endpoint: "mock://grafana/d/configcenter",
        statusCode: 200,
        contentType: "application/json",
        freshnessSec: 42,
        panel: "configcenter-api-latency",
      },
      prometheus: {
        endpoint: "mock://prometheus/api/v1/query",
        statusCode: 200,
        freshnessSec: 30,
        resultCount: 3,
        query: "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
      },
      logs: {
        available: true,
        samples: [
          "slow query on cc_CfgFileDeployRecord duration=1840ms trace=trace-001",
          "request project=freefire user=tome route=/api/v3/biz/search/0",
        ],
      },
      traces: {
        available: true,
        traceId: "trace-001",
        slowSpan: "mongo.find cc_CfgFileDeployRecord 1780ms",
      },
    },
    permission: {
      project: "freefire",
      headers: {
        currentUser: "tome",
        apiTokenUser: "admin@localhost",
      },
      redisUserPermission: {
        user: "tome",
        projects: ["freefire", "configcenter"],
        refreshedAt: "2026-05-25T10:02:00+08:00",
      },
      aclSnapshot: {
        users: {
          "tome": ["freefire", "configcenter"],
        },
        capturedAt: "2026-05-25T10:01:50+08:00",
      },
    },
    safety: {
      target: "test-host:36422",
      command: "systemctl restart configcenter-api",
      requestedBy: "tome",
      reason: "仅生成审批草案，不真实执行。",
    },
    sql: {
      table: "cc_CfgFileDeployRecord",
      idColumn: "id",
      ids: [1201, 1202],
      statusColumn: "status",
      fromStatus: "stuck",
      toStatus: "retry_pending",
      reason: "修复卡在发布队列里的两条测试记录。",
    },
    mcp: {
      baseUrl: "http://127.0.0.1:18080",
      candidatePath: "/mcp",
      httpStatus: 200,
      initializeOk: true,
      toolsListOk: true,
      tools: ["query_metrics", "query_logs", "query_traces"],
    },
    retro: {
      timeline: [
        { time: "10:00", event: "发布后 p95 延迟告警触发" },
        { time: "10:04", event: "确认慢查询集中在 cc_CfgFileDeployRecord" },
        { time: "10:12", event: "生成 SQL 草案并等待 DBA 审核" },
      ],
      impact: {
        users: "测试环境配置中心用户",
        durationMin: 18,
        scope: "查询接口变慢，未影响写入。",
      },
      rootCause: "发布队列状态卡住导致查询扫描未完成记录，触发慢查询。",
      evidence: ["p95_latency_ms=1840", "trace=trace-001 slowSpan=mongo.find", "project=freefire permission verified"],
      fix: ["补充 DBA 审核后的状态修复 SQL", "发布后重新检查 p95 和慢查询日志"],
      prevention: ["为发布队列状态增加超时告警", "把慢查询 explain 纳入回归检查"],
      rawText: "token=<redacted> password=<redacted>",
    },
  };
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return deepMerge(base, overrides);
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runCoordinator(input = createMockCapstoneInput()) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    agent: "coordinator-agent",
    goal: input.goal,
    plan: [
      "observability-agent",
      "permission-agent",
      "safety-agent",
      "sql-agent",
      "mcp-verifier-agent",
      "retro-agent",
    ],
    rule: "权限和安全未通过时，后续执行类阶段必须停止，只能输出人工审计结论。",
  };
}

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function createAgentStates() {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return new Map(CAPSTONE_AGENTS.map((agent) => [agent.id, { status: "pending", summary: "" }]));
}

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function markAgent(states, id, status, summary) {
  states.set(id, { status, summary });
}

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function materializeAgents(states) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return CAPSTONE_AGENTS.map((agent) => ({
    ...agent,
    status: states.get(agent.id)?.status ?? "pending",
    summary: states.get(agent.id)?.summary ?? "",
  }));
}

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function handoff(from, to, status, summary, evidenceRefs = []) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return { from, to, status, summary, evidenceRefs };
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runObservabilityAgent(snapshot = createMockCapstoneInput().observability) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const grafanaTrusted =
    snapshot.grafana?.statusCode === 200 &&
    snapshot.grafana?.contentType === "application/json" &&
    // 教学：调用函数：把当前数据交给已有逻辑处理。
    Number(snapshot.grafana?.freshnessSec) <= 120;
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const prometheusTrusted =
    snapshot.prometheus?.statusCode === 200 &&
    // 教学：调用函数：把当前数据交给已有逻辑处理。
    Number(snapshot.prometheus?.freshnessSec) <= 120 &&
    // 教学：调用函数：把当前数据交给已有逻辑处理。
    Number(snapshot.prometheus?.resultCount) > 0;
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const logsTrusted = Boolean(snapshot.logs?.available && snapshot.logs.samples?.length);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const tracesTrusted = Boolean(snapshot.traces?.available && snapshot.traces.traceId);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const checks = [
    { id: "grafana", ok: grafanaTrusted, evidence: snapshot.grafana },
    { id: "prometheus", ok: prometheusTrusted, evidence: snapshot.prometheus },
    { id: "logs", ok: logsTrusted, evidence: snapshot.logs },
    { id: "traces", ok: tracesTrusted, evidence: snapshot.traces },
  ];
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    agent: "observability-agent",
    status: checks.every((item) => item.ok) ? "trusted" : "degraded",
    checks,
    summary: checks.every((item) => item.ok)
      ? "观测链路新鲜且协议正确，可以作为后续判断证据。"
      : "观测链路存在缺口，后续结论必须降级为人工复核。",
  };
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function resolveEffectiveUser(headers = {}) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return headers.currentUser || headers["x-current-user"] || headers["X-Current-User"] || null;
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runPermissionAgent(snapshot = createMockCapstoneInput().permission) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const effectiveUser = resolveEffectiveUser(snapshot.headers);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const cacheProjects = new Set(snapshot.redisUserPermission?.projects ?? []);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const aclProjects = new Set(snapshot.aclSnapshot?.users?.[effectiveUser] ?? []);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const project = snapshot.project;
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const checks = [
    { id: "effective-user", ok: Boolean(effectiveUser), detail: effectiveUser ?? "missing" },
    { id: "permission-cache", ok: Boolean(snapshot.redisUserPermission), detail: snapshot.redisUserPermission?.refreshedAt ?? "missing" },
    { id: "acl-snapshot", ok: Boolean(snapshot.aclSnapshot), detail: snapshot.aclSnapshot?.capturedAt ?? "missing" },
    { id: "cache-allows-project", ok: cacheProjects.has(project), detail: project },
    { id: "acl-allows-project", ok: aclProjects.has(project), detail: project },
  ];
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const failed = checks.find((item) => !item.ok);
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    agent: "permission-agent",
    status: failed ? "blocked" : "allowed",
    blockedReason: failed?.id,
    effectiveUser,
    apiTokenIgnored: Boolean(snapshot.headers?.apiTokenUser),
    checks,
    summary: failed
      ? `权限核验失败：${failed.id}。`
      : "真实用户、权限缓存和 ACL snapshot 一致，允许进入审批草案阶段。",
  };
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function classifyCommand(command = "") {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const normalized = String(command).trim().replace(/\s+/g, " ");
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const catastrophic = [
    /\brm\s+-rf\s+\/(?:\s|$)/i,
    /\bmkfs(?:\.|\s)/i,
    /\bdd\s+.*\bof=\/dev\//i,
    /\bchmod\s+-R\s+777\s+\/(?:\s|$)/i,
    /\bDROP\s+DATABASE\b/i,
    /\bTRUNCATE\s+TABLE\b/i,
    /\bredis-cli\s+FLUSHALL\b/i,
  ];
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (catastrophic.some((pattern) => pattern.test(normalized))) {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return {
      status: "blocked",
      reason: "catastrophic-command",
      approvalRequired: false,
      dryRunOnly: false,
    };
  }

  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const approvalRequired = [
    /\bsystemctl\s+(restart|stop|start|reload)\b/i,
    /\bsupervisorctl\s+(restart|stop|start)\b/i,
    /\bkubectl\s+(delete|rollout restart|scale)\b/i,
    /\bmysql\b|\bpsql\b/i,
  ].some((pattern) => pattern.test(normalized));
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (approvalRequired) {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return {
      status: "pending-approval",
      reason: "state-changing-command",
      approvalRequired: true,
      dryRunOnly: true,
    };
  }

  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    status: "dry-run",
    reason: "read-only-or-unknown-command",
    approvalRequired: false,
    dryRunOnly: true,
  };
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runSafetyAgent(snapshot = createMockCapstoneInput().safety) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const classification = classifyCommand(snapshot.command);
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    agent: "safety-agent",
    target: snapshot.target,
    command: snapshot.command,
    status: classification.status,
    reason: classification.reason,
    approvalRequired: classification.approvalRequired,
    dryRunOnly: classification.dryRunOnly,
    executableByAgent: false,
    summary:
      classification.status === "blocked"
        ? "命令命中灾难性模式，不能进入审批。"
        : classification.status === "pending-approval"
          ? "命令会改变远程状态，只能生成审批草案，等待人工执行。"
          : "命令按 dry-run 记录，不在本示例里真实执行。",
  };
}

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function assertSqlIdentifier(value, label) {
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(value))) {
    // 教学：抛出错误：让调用方知道当前流程不能继续。
    throw new Error(`${label} must be a simple SQL identifier`);
  }
}

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function escapeSqlValue(value) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return String(value).replaceAll("'", "''");
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runSqlAgent(request = createMockCapstoneInput().sql) {
  // 教学：调用函数：把当前数据交给已有逻辑处理。
  assertSqlIdentifier(request.table, "table");
  // 教学：调用函数：把当前数据交给已有逻辑处理。
  assertSqlIdentifier(request.idColumn, "idColumn");
  // 教学：调用函数：把当前数据交给已有逻辑处理。
  assertSqlIdentifier(request.statusColumn, "statusColumn");
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!Array.isArray(request.ids) || request.ids.length === 0) {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return {
      agent: "sql-agent",
      status: "rejected",
      executableByAgent: false,
      reason: "missing-id-list",
      sql: "",
      rollbackSql: "",
      risks: ["没有明确 id 列表时不能生成 UPDATE。"],
    };
  }

  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const ids = request.ids.map((id) => Number(id));
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return {
      agent: "sql-agent",
      status: "rejected",
      executableByAgent: false,
      reason: "invalid-id-list",
      sql: "",
      rollbackSql: "",
      risks: ["id 必须是正整数，避免拼接出不可审计条件。"],
    };
  }

  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const idList = ids.join(", ");
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const fromStatus = escapeSqlValue(request.fromStatus);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const toStatus = escapeSqlValue(request.toStatus);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const sql = [
    "START TRANSACTION;",
    `SELECT ${request.idColumn}, ${request.statusColumn} FROM ${request.table} WHERE ${request.idColumn} IN (${idList}) FOR UPDATE;`,
    `UPDATE ${request.table} SET ${request.statusColumn} = '${toStatus}' WHERE ${request.idColumn} IN (${idList}) AND ${request.statusColumn} = '${fromStatus}';`,
    "-- 人工确认 affected rows 和业务窗口后再 COMMIT；否则 ROLLBACK。",
  ].join("\n");
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const rollbackSql = [
    "START TRANSACTION;",
    `SELECT ${request.idColumn}, ${request.statusColumn} FROM ${request.table} WHERE ${request.idColumn} IN (${idList}) FOR UPDATE;`,
    `UPDATE ${request.table} SET ${request.statusColumn} = '${fromStatus}' WHERE ${request.idColumn} IN (${idList}) AND ${request.statusColumn} = '${toStatus}';`,
    "COMMIT;",
  ].join("\n");

  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    agent: "sql-agent",
    status: "drafted",
    executableByAgent: false,
    reason: request.reason,
    sql,
    rollbackSql,
    risks: [
      "必须由 DBA 在目标库人工审核和执行。",
      "执行前需要确认事务隔离、affected rows、备份和业务窗口。",
    ],
  };
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runMcpVerifierAgent(probe = createMockCapstoneInput().mcp) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const endpoint = `${probe.baseUrl}${probe.candidatePath}`;
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (probe.candidatePath !== "/mcp") {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return {
      agent: "mcp-verifier-agent",
      endpoint,
      status: "wrong-endpoint",
      reason: "/health、/sse 或根 URL 可访问不等于 MCP 协议可用。",
      checks: [
        { id: "endpoint-path", ok: false, expected: "/mcp", actual: probe.candidatePath },
        { id: "http-reachable", ok: Number(probe.httpStatus) >= 200 && Number(probe.httpStatus) < 500 },
        { id: "initialize", ok: false },
        { id: "tools-list", ok: false },
      ],
    };
  }

  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const checks = [
    { id: "endpoint-path", ok: true, expected: "/mcp", actual: probe.candidatePath },
    { id: "http-reachable", ok: Number(probe.httpStatus) >= 200 && Number(probe.httpStatus) < 300 },
    { id: "initialize", ok: Boolean(probe.initializeOk) },
    { id: "tools-list", ok: Boolean(probe.toolsListOk && probe.tools?.length) },
  ];
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    agent: "mcp-verifier-agent",
    endpoint,
    status: checks.every((item) => item.ok) ? "ready" : "protocol-failed",
    reason: checks.every((item) => item.ok)
      ? "MCP endpoint、initialize 和 tools/list 均通过。"
      : "MCP 协议验真失败，不能把服务登记给 Agent。",
    checks,
    tools: probe.tools ?? [],
  };
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function hasSensitiveLeak(text) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return /(token|password|client_secret|api_key)=((?!<redacted>)[^\s]+)/i.test(String(text || ""));
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runRetroAgent(report = createMockCapstoneInput().retro) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const missing = [];
  // 教学：循环：按顺序处理多条数据或多个步骤。
  for (const section of RETRO_REQUIRED_SECTIONS) {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const value = report[section];
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (Array.isArray(value) ? value.length === 0 : !value) {
      missing.push(section);
    }
  }
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const checks = [
    { id: "timeline", ok: Array.isArray(report.timeline) && report.timeline.length >= 2 },
    { id: "impact", ok: Boolean(report.impact?.durationMin && report.impact?.scope) },
    { id: "root-cause", ok: Boolean(report.rootCause && !/unknown|待补/i.test(report.rootCause)) },
    { id: "evidence", ok: Array.isArray(report.evidence) && report.evidence.length >= 2 },
    { id: "fix", ok: Array.isArray(report.fix) && report.fix.length > 0 },
    { id: "prevention", ok: Array.isArray(report.prevention) && report.prevention.length > 0 },
    { id: "redaction", ok: !hasSensitiveLeak(report.rawText) },
  ];
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const passed = checks.filter((item) => item.ok).length;
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const status = passed === checks.length ? "ready" : passed >= 5 ? "needs-polish" : "incomplete";
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    agent: "retro-agent",
    status,
    missing,
    checks,
    summary: status === "ready" ? "复盘结构完整且已脱敏。" : "复盘缺少关键字段或存在敏感信息泄露。",
  };
}

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function buildFinalReport(input, evidenceBoard, decision) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    incidentId: input.incidentId,
    readyForHumanReview: decision.status === "ready-for-human-review",
    summary: decision.summary,
    sections: {
      observability: evidenceBoard.observability?.summary ?? "skipped",
      permission: evidenceBoard.permission?.summary ?? "skipped",
      safety: evidenceBoard.safety?.summary ?? "skipped",
      sql: evidenceBoard.sql?.status ?? "skipped",
      mcp: evidenceBoard.mcp?.status ?? "skipped",
      retro: evidenceBoard.retro?.status ?? "skipped",
    },
    audit: {
      localOnly: true,
      externalCalls: 0,
      commandExecuted: false,
      sqlExecuted: false,
      mcpRegistered: false,
      redactionChecked: Boolean(evidenceBoard.retro),
    },
  };
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runCompleteMultiAgentClosure(input = createMockCapstoneInput()) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const runId = input.runId ?? "day56-mock-run";
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const agentStates = createAgentStates();
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const handoffs = [];
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const evidenceBoard = {};
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const unresolvedRisks = [];
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const coordinator = runCoordinator(input);

  // 教学：调用函数：把当前数据交给已有逻辑处理。
  markAgent(agentStates, "coordinator-agent", "running", "已拆分完整工程闭环任务。");
  handoffs.push(handoff("user", "coordinator-agent", "accepted", input.goal));
  handoffs.push(handoff("coordinator-agent", "observability-agent", "sent", "先确认观测证据是否可信。"));

  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const observability = runObservabilityAgent(input.observability);
  evidenceBoard.observability = observability;
  // 教学：调用函数：把当前数据交给已有逻辑处理。
  markAgent(agentStates, "observability-agent", "completed", observability.summary);
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (observability.status !== "trusted") {
    unresolvedRisks.push("观测链路存在降级证据，最终结论需要人工复核。");
  }
  handoffs.push(handoff("observability-agent", "permission-agent", "sent", "带着可信证据进入权限核验。", ["observability"]));

  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const permission = runPermissionAgent(input.permission);
  evidenceBoard.permission = permission;
  // 教学：调用函数：把当前数据交给已有逻辑处理。
  markAgent(agentStates, "permission-agent", permission.status === "allowed" ? "completed" : "blocked", permission.summary);
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (permission.status !== "allowed") {
    // 教学：循环：按顺序处理多条数据或多个步骤。
    for (const agent of ["safety-agent", "sql-agent", "mcp-verifier-agent", "retro-agent"]) {
      // 教学：调用函数：把当前数据交给已有逻辑处理。
      markAgent(agentStates, agent, "skipped", "权限未通过，执行类阶段停止。");
    }
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const decision = {
      status: "blocked-by-permission",
      blockedBy: ["permission-agent"],
      approvalRequired: false,
      summary: "权限缓存、ACL 或真实用户身份不完整，coordinator 不允许进入远程执行和 SQL 阶段。",
    };
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const finalReport = buildFinalReport(input, evidenceBoard, decision);
    // 教学：调用函数：把当前数据交给已有逻辑处理。
    markAgent(agentStates, "coordinator-agent", "completed", "已输出权限阻断结论。");
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return {
      day: 56,
      title: "完整多 Agent 工程闭环 Capstone",
      localOnly: true,
      runId,
      agents: materializeAgents(agentStates),
      handoffs,
      evidenceBoard,
      decision,
      finalReport,
      unresolvedRisks,
    };
  }

  handoffs.push(handoff("permission-agent", "safety-agent", "sent", "权限已核验，进入远程命令审批判断。", ["permission"]));
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const safety = runSafetyAgent(input.safety);
  evidenceBoard.safety = safety;
  // 教学：调用函数：把当前数据交给已有逻辑处理。
  markAgent(agentStates, "safety-agent", safety.status === "blocked" ? "blocked" : "completed", safety.summary);
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (safety.status === "blocked") {
    // 教学：循环：按顺序处理多条数据或多个步骤。
    for (const agent of ["sql-agent", "mcp-verifier-agent", "retro-agent"]) {
      // 教学：调用函数：把当前数据交给已有逻辑处理。
      markAgent(agentStates, agent, "skipped", "安全审批阻断，后续阶段停止。");
    }
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const decision = {
      status: "blocked-by-safety",
      blockedBy: ["safety-agent"],
      approvalRequired: false,
      summary: "远程命令命中灾难性模式，不能进入审批或执行。",
    };
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const finalReport = buildFinalReport(input, evidenceBoard, decision);
    // 教学：调用函数：把当前数据交给已有逻辑处理。
    markAgent(agentStates, "coordinator-agent", "completed", "已输出安全阻断结论。");
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return {
      day: 56,
      title: "完整多 Agent 工程闭环 Capstone",
      localOnly: true,
      runId,
      agents: materializeAgents(agentStates),
      handoffs,
      evidenceBoard,
      decision,
      finalReport,
      unresolvedRisks,
    };
  }
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (safety.approvalRequired) {
    unresolvedRisks.push("远程状态变更仍需要人工审批和人工执行。");
  }

  handoffs.push(handoff("safety-agent", "sql-agent", "sent", "只生成 SQL 草案和回滚 SQL，不执行。", ["safety"]));
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const sql = runSqlAgent(input.sql);
  evidenceBoard.sql = sql;
  // 教学：调用函数：把当前数据交给已有逻辑处理。
  markAgent(agentStates, "sql-agent", sql.status === "drafted" ? "completed" : "blocked", sql.status);
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (sql.status !== "drafted") {
    unresolvedRisks.push("SQL 草案生成失败，需要补齐可审计条件。");
  }

  handoffs.push(handoff("sql-agent", "mcp-verifier-agent", "sent", "验证 MCP 协议入口是否真实可用。", ["sql"]));
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const mcp = runMcpVerifierAgent(input.mcp);
  evidenceBoard.mcp = mcp;
  // 教学：调用函数：把当前数据交给已有逻辑处理。
  markAgent(agentStates, "mcp-verifier-agent", mcp.status === "ready" ? "completed" : "blocked", mcp.reason);
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (mcp.status !== "ready") {
    unresolvedRisks.push("MCP endpoint 未通过 /mcp + initialize + tools/list 验真。");
  }

  handoffs.push(handoff("mcp-verifier-agent", "retro-agent", "sent", "检查最终复盘质量和脱敏。", ["mcp"]));
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const retro = runRetroAgent(input.retro);
  evidenceBoard.retro = retro;
  // 教学：调用函数：把当前数据交给已有逻辑处理。
  markAgent(agentStates, "retro-agent", retro.status === "ready" ? "completed" : "blocked", retro.summary);
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (retro.status !== "ready") {
    unresolvedRisks.push("复盘缺少关键字段或存在敏感字段泄露。");
  }

  handoffs.push(handoff("retro-agent", "coordinator-agent", "sent", "汇总证据板和最终结论。", ["retro"]));
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const blockingAgents = [
    sql.status !== "drafted" ? "sql-agent" : null,
    mcp.status !== "ready" ? "mcp-verifier-agent" : null,
    retro.status !== "ready" ? "retro-agent" : null,
  ].filter(Boolean);
  // 教学：定义变量：这个值后面会被更新，所以使用 let。
  let status = "ready-for-human-review";
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (mcp.status !== "ready" && retro.status !== "ready") {
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    status = "needs-human-review";
  } else if (mcp.status !== "ready") {
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    status = "needs-mcp-fix";
  } else if (retro.status !== "ready") {
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    status = "needs-retro-fix";
  } else if (sql.status !== "drafted") {
    // 教学：更新状态：这里会改变前面定义的变量或对象字段。
    status = "needs-sql-fix";
  }
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const decision = {
    status,
    blockedBy: blockingAgents,
    approvalRequired: safety.approvalRequired,
    summary:
      // 教学：更新状态：这里会改变前面定义的变量或对象字段。
      status === "ready-for-human-review"
        ? "所有 Agent 已完成 handoff，外部动作均未执行，结论可提交人工审阅。"
        : "闭环存在未解决风险，不能标记为 ready。",
  };
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const finalReport = buildFinalReport(input, evidenceBoard, decision);
  // 教学：调用函数：把当前数据交给已有逻辑处理。
  markAgent(agentStates, "coordinator-agent", "completed", "已汇总 evidence board 和最终审计结论。");

  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 56,
    title: "完整多 Agent 工程闭环 Capstone",
    localOnly: true,
    runId,
    agents: materializeAgents(agentStates),
    handoffs,
    evidenceBoard,
    decision,
    finalReport,
    unresolvedRisks,
  };
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo() {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return runCompleteMultiAgentClosure(createMockCapstoneInput());
}
