/**
 * Day 2：自包含学习源码。
 *
 * 这个文件属于 day02-multi-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 导出类：把相关状态和方法组合成一个可复用对象。
export class HandoffError extends Error {
  // 构造函数：new 这个类时会先运行这里，保存后续方法要用的状态。
  constructor(message) {
    // 调用函数：把当前数据交给已有逻辑处理。
    super(message);
    this.name = 'HandoffError';
  }
}

/** 去掉模型可能包裹的 Markdown 代码块，便于继续解析 JSON。 */
function stripFence(text) {
  const trimmed = String(text || '').trim();
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return match ? match[1].trim() : trimmed;
}

/** 从模型文本里提取第一个 JSON 对象，降低本地模型输出噪声影响。 */
export function extractJson(text) {
  const source = stripFence(text);
  const start = source.indexOf('{');
  if (start < 0) {
    throw new HandoffError('没有找到 JSON 对象');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) {
        // 更新状态：这里会改变前面定义的变量或对象字段。
        escaped = false;
      } else if (char === '\\') {
        // 更新状态：这里会改变前面定义的变量或对象字段。
        escaped = true;
      } else if (char === '"') {
        // 更新状态：这里会改变前面定义的变量或对象字段。
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      // 更新状态：这里会改变前面定义的变量或对象字段。
      inString = true;
      continue;
    }
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        // 解析 JSON：把字符串还原成 JS 对象，方便后续读取字段。
        return JSON.parse(source.slice(start, index + 1));
      }
    }
  }
  throw new HandoffError('JSON 对象不完整');
}

/** 解析 planner 输出，确保多 agent 交接协议可控。 */
export function parsePlan(text) {
  const value = extractJson(text);
  if (value.type !== 'plan' || !Array.isArray(value.steps) || value.steps.length === 0) {
    throw new HandoffError('planner 必须输出 {type:"plan", steps:[...]}');
  }
  const steps = value.steps.map((step, index) => {
    if (!step || typeof step !== 'object') {
      throw new HandoffError(`plan.steps[${index}] 必须是对象`);
    }
    if (typeof step.tool !== 'string' || !step.tool.trim()) {
      throw new HandoffError(`plan.steps[${index}] 缺少 tool`);
    }
    return {
      id: typeof step.id === 'string' && step.id.trim() ? step.id.trim() : `step-${index + 1}`,
      reason: typeof step.reason === 'string' ? step.reason : '',
      tool: step.tool.trim(),
      input: step.input && typeof step.input === 'object' && !Array.isArray(step.input) ? step.input : {},
    };
  });
  return { type: 'plan', steps };
}

/** 解析 critic 输出，确保审查结论结构稳定。 */
export function parseCritique(text) {
  const value = extractJson(text);
  if (value.type !== 'critique') {
    throw new HandoffError('critic 必须输出 {type:"critique", ok:boolean, issues:[]}');
  }
  return {
    type: 'critique',
    ok: value.ok === true,
    issues: Array.isArray(value.issues) ? value.issues.map(String) : [],
  };
}

/** 解析 writer 输出，确保最终回答只从 final 字段读取。 */
export function parseFinal(text) {
  const value = extractJson(text);
  if (value.type !== 'final' || typeof value.answer !== 'string' || !value.answer.trim()) {
    throw new HandoffError('writer 必须输出 {type:"final", answer:"..."}');
  }
  return {
    type: 'final',
    answer: value.answer.trim(),
  };
}

