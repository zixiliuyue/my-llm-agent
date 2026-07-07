/**
 * Day 4：自包含学习源码。
 *
 * 这个文件属于 day04-tools-and-mcp，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
/**
 * Day 04：工具注册表与 MCP mock。
 *
 * 本文件自包含实现 calculator/current_time 等 read-only 工具，并在代码层
 * 做 schema 校验和风险拦截，避免依赖其它 day 的源码。
 */

const registry = new Map();

/** 注册一个工具定义到当前 day 的内存注册表。 */
function registerTool(tool) {
  registry.set(tool.name, tool);
}

/** 根据非常小的 schema 描述校验输入对象。 */
function validateInput(schema = {}, input = {}) {
  for (const [key, rule] of Object.entries(schema)) {
    const required = rule.required === true;
    const value = input[key];
    if (required && (value === undefined || value === null || value === '')) {
      return `${key} 是必填字段`;
    }
    if (value !== undefined && rule.type && typeof value !== rule.type) {
      return `${key} 必须是 ${rule.type}`;
    }
  }
  return null;
}

/** 执行安全算术表达式。这里只允许数字和运算符，避免任意代码执行。 */
function runCalculator(input = {}) {
  const expression = input.expression;
  if (!/^[0-9+\-*/%().\s]+$/.test(expression)) {
    return { ok: false, error: '表达式包含不允许的字符' };
  }
  try {
    const value = Function(`"use strict"; return (${expression})`)();
    return Number.isFinite(value)
      ? { ok: true, data: { expression, value } }
      : { ok: false, error: '计算结果不是有限数字' };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/** 读取当前时间，作为 read-only 工具示例。 */
function runCurrentTime() {
  const now = new Date();
  return { ok: true, data: { iso: now.toISOString(), text: now.toLocaleString('zh-CN') } };
}

// 调用函数：把当前数据交给已有逻辑处理。
registerTool({
  name: 'calculator',
  description: '计算安全算术表达式。',
  risk: 'read-only',
  schema: { expression: { type: 'string', required: true } },
  execute: runCalculator,
});

// 调用函数：把当前数据交给已有逻辑处理。
registerTool({
  name: 'current_time',
  description: '读取当前时间。',
  risk: 'read-only',
  schema: { timezone: { type: 'string', required: false } },
  execute: runCurrentTime,
});

// 调用函数：把当前数据交给已有逻辑处理。
registerTool({
  name: 'write_file_mock',
  description: '演示本地写入类工具的权限边界，不实际写文件。',
  risk: 'local-write',
  schema: { path: { type: 'string', required: true }, content: { type: 'string', required: true } },
  execute: async (input) => ({ ok: true, data: { dryRun: true, input } }),
});

// 调用函数：把当前数据交给已有逻辑处理。
registerTool({
  name: 'remote_shell_mock',
  description: '演示远程命令类工具的权限边界，不实际执行。',
  risk: 'remote',
  schema: { command: { type: 'string', required: true } },
  execute: async (input) => ({ ok: true, data: { dryRun: true, input } }),
});

/** 列出工具的公开元信息，不暴露 execute 函数。 */
export function listTools() {
  return [...registry.values()].map(({ name, description, risk, schema }) => ({
    name,
    description,
    risk,
    schema,
  }));
}

/** 用本地注册表模拟 MCP list_tools 返回。 */
export function listMockMcpTools() {
  return listTools().map((tool) => ({
    source: 'mock-mcp',
    ...tool,
  }));
}

/** 调用注册工具，并在执行前做 schema 校验和风险策略判断。 */
// 导出异步函数：调用方需要 await 它，因为内部可能读文件、请求接口或等待模型。
export async function callRegisteredTool(name, input = {}, { allowRisk = ['read-only'] } = {}) {
  const tool = registry.get(name);
  if (!tool) {
    return {
      ok: false,
      error: `未知工具: ${name}。可用工具: ${listTools().map((item) => item.name).join(', ')}`,
    };
  }

  const schemaError = validateInput(tool.schema, input);
  if (schemaError) {
    return { ok: false, error: `参数错误: ${schemaError}` };
  }

  if (!allowRisk.includes(tool.risk)) {
    return {
      ok: false,
      error: `工具 ${name} 风险级别为 ${tool.risk}，当前策略不允许执行`,
      blocked: true,
      risk: tool.risk,
    };
  }

  return tool.execute(input);
}
