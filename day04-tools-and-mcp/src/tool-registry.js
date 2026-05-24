import { runTool as runDay01Tool } from '../../day01-single-agent-cli/src/tools.js';

const registry = new Map();

function registerTool(tool) {
  registry.set(tool.name, tool);
}

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

registerTool({
  name: 'calculator',
  description: '计算安全算术表达式。',
  risk: 'read-only',
  schema: { expression: { type: 'string', required: true } },
  execute: (input) => runDay01Tool('calculator', input),
});

registerTool({
  name: 'current_time',
  description: '读取当前时间。',
  risk: 'read-only',
  schema: { timezone: { type: 'string', required: false } },
  execute: (input) => runDay01Tool('current_time', input),
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

export function listTools() {
  return [...registry.values()].map(({ name, description, risk, schema }) => ({
    name,
    description,
    risk,
    schema,
  }));
}

export function listMockMcpTools() {
  return listTools().map((tool) => ({
    source: 'mock-mcp',
    ...tool,
  }));
}

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

