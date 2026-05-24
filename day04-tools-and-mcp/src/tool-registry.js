/**
 * Day 04：工具注册表与 MCP mock。
 *
 * 本文件自包含实现 calculator/current_time 等 read-only 工具，并在代码层
 * 做 schema 校验和风险拦截，避免依赖其它 day 的源码。
 */

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const registry = new Map();

/** 注册一个工具定义到当前 day 的内存注册表。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function registerTool(tool) {
  registry.set(tool.name, tool);
}

/** 根据非常小的 schema 描述校验输入对象。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function validateInput(schema = {}, input = {}) {
  // 教学：循环：按顺序处理多条数据或多个步骤。
  for (const [key, rule] of Object.entries(schema)) {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const required = rule.required === true;
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const value = input[key];
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (required && (value === undefined || value === null || value === '')) {
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return `${key} 是必填字段`;
    }
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (value !== undefined && rule.type && typeof value !== rule.type) {
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return `${key} 必须是 ${rule.type}`;
    }
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return null;
}

/** 执行安全算术表达式。这里只允许数字和运算符，避免任意代码执行。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function runCalculator(input = {}) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const expression = input.expression;
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!/^[0-9+\-*/%().\s]+$/.test(expression)) {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return { ok: false, error: '表达式包含不允许的字符' };
  }
  // 教学：try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
  try {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const value = Function(`"use strict"; return (${expression})`)();
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return Number.isFinite(value)
      ? { ok: true, data: { expression, value } }
      : { ok: false, error: '计算结果不是有限数字' };
  } catch (error) {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return { ok: false, error: error.message };
  }
}

/** 读取当前时间，作为 read-only 工具示例。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function runCurrentTime() {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const now = new Date();
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return { ok: true, data: { iso: now.toISOString(), text: now.toLocaleString('zh-CN') } };
}

registerTool({
  name: 'calculator',
  description: '计算安全算术表达式。',
  risk: 'read-only',
  schema: { expression: { type: 'string', required: true } },
  execute: runCalculator,
});

registerTool({
  name: 'current_time',
  description: '读取当前时间。',
  risk: 'read-only',
  schema: { timezone: { type: 'string', required: false } },
  execute: runCurrentTime,
});

registerTool({
  name: 'write_file_mock',
  description: '演示本地写入类工具的权限边界，不实际写文件。',
  risk: 'local-write',
  schema: { path: { type: 'string', required: true }, content: { type: 'string', required: true } },
  execute: async (input) => ({ ok: true, data: { dryRun: true, input } }),
});

registerTool({
  name: 'remote_shell_mock',
  description: '演示远程命令类工具的权限边界，不实际执行。',
  risk: 'remote',
  schema: { command: { type: 'string', required: true } },
  execute: async (input) => ({ ok: true, data: { dryRun: true, input } }),
});

/** 列出工具的公开元信息，不暴露 execute 函数。 */
// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function listTools() {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return [...registry.values()].map(({ name, description, risk, schema }) => ({
    name,
    description,
    risk,
    schema,
  }));
}

/** 用本地注册表模拟 MCP list_tools 返回。 */
// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function listMockMcpTools() {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return listTools().map((tool) => ({
    source: 'mock-mcp',
    ...tool,
  }));
}

/** 调用注册工具，并在执行前做 schema 校验和风险策略判断。 */
// 教学：导出异步函数：调用方需要 await 它，因为内部可能读文件、请求接口或等待模型。
export async function callRegisteredTool(name, input = {}, { allowRisk = ['read-only'] } = {}) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const tool = registry.get(name);
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!tool) {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return {
      ok: false,
      error: `未知工具: ${name}。可用工具: ${listTools().map((item) => item.name).join(', ')}`,
    };
  }

  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const schemaError = validateInput(tool.schema, input);
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (schemaError) {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return { ok: false, error: `参数错误: ${schemaError}` };
  }

  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!allowRisk.includes(tool.risk)) {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return {
      ok: false,
      error: `工具 ${name} 风险级别为 ${tool.risk}，当前策略不允许执行`,
      blocked: true,
      risk: tool.risk,
    };
  }

  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return tool.execute(input);
}
