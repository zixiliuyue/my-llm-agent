/**
 * Day 2：自包含学习源码。
 *
 * 这个文件属于 day02-multi-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 教学：导出类：把相关状态和方法组合成一个可复用对象。
export class HandoffError extends Error {
  // 教学：构造函数：new 这个类时会先运行这里，保存后续方法要用的状态。
  constructor(message) {
    // 教学：调用函数：把当前数据交给已有逻辑处理。
    super(message);
    this.name = 'HandoffError';
  }
}

/** 去掉模型可能包裹的 Markdown 代码块，便于继续解析 JSON。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function stripFence(text) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const trimmed = String(text || '').trim();
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return match ? match[1].trim() : trimmed;
}

/** 从模型文本里提取第一个 JSON 对象，降低本地模型输出噪声影响。 */
// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function extractJson(text) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const source = stripFence(text);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const start = source.indexOf('{');
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (start < 0) {
    // 教学：抛出错误：让调用方知道当前流程不能继续。
    throw new HandoffError('没有找到 JSON 对象');
  }

  // 教学：定义变量：这个值后面会被更新，所以使用 let。
  let depth = 0;
  // 教学：定义变量：这个值后面会被更新，所以使用 let。
  let inString = false;
  // 教学：定义变量：这个值后面会被更新，所以使用 let。
  let escaped = false;
  // 教学：循环：按顺序处理多条数据或多个步骤。
  for (let index = start; index < source.length; index += 1) {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const char = source[index];
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (inString) {
      // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (escaped) {
        // 教学：更新状态：这里会改变前面定义的变量或对象字段。
        escaped = false;
      } else if (char === '\\') {
        // 教学：更新状态：这里会改变前面定义的变量或对象字段。
        escaped = true;
      } else if (char === '"') {
        // 教学：更新状态：这里会改变前面定义的变量或对象字段。
        inString = false;
      }
      continue;
    }
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (char === '"') {
      // 教学：更新状态：这里会改变前面定义的变量或对象字段。
      inString = true;
      continue;
    }
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (depth === 0) {
        // 教学：解析 JSON：把字符串还原成 JS 对象，方便后续读取字段。
        return JSON.parse(source.slice(start, index + 1));
      }
    }
  }
  // 教学：抛出错误：让调用方知道当前流程不能继续。
  throw new HandoffError('JSON 对象不完整');
}

/** 解析 planner 输出，确保多 agent 交接协议可控。 */
// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function parsePlan(text) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const value = extractJson(text);
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (value.type !== 'plan' || !Array.isArray(value.steps) || value.steps.length === 0) {
    // 教学：抛出错误：让调用方知道当前流程不能继续。
    throw new HandoffError('planner 必须输出 {type:"plan", steps:[...]}');
  }
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const steps = value.steps.map((step, index) => {
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!step || typeof step !== 'object') {
      // 教学：抛出错误：让调用方知道当前流程不能继续。
      throw new HandoffError(`plan.steps[${index}] 必须是对象`);
    }
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (typeof step.tool !== 'string' || !step.tool.trim()) {
      // 教学：抛出错误：让调用方知道当前流程不能继续。
      throw new HandoffError(`plan.steps[${index}] 缺少 tool`);
    }
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return {
      id: typeof step.id === 'string' && step.id.trim() ? step.id.trim() : `step-${index + 1}`,
      reason: typeof step.reason === 'string' ? step.reason : '',
      tool: step.tool.trim(),
      input: step.input && typeof step.input === 'object' && !Array.isArray(step.input) ? step.input : {},
    };
  });
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return { type: 'plan', steps };
}

/** 解析 critic 输出，确保审查结论结构稳定。 */
// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function parseCritique(text) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const value = extractJson(text);
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (value.type !== 'critique') {
    // 教学：抛出错误：让调用方知道当前流程不能继续。
    throw new HandoffError('critic 必须输出 {type:"critique", ok:boolean, issues:[]}');
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    type: 'critique',
    ok: value.ok === true,
    issues: Array.isArray(value.issues) ? value.issues.map(String) : [],
  };
}

/** 解析 writer 输出，确保最终回答只从 final 字段读取。 */
// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function parseFinal(text) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const value = extractJson(text);
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (value.type !== 'final' || typeof value.answer !== 'string' || !value.answer.trim()) {
    // 教学：抛出错误：让调用方知道当前流程不能继续。
    throw new HandoffError('writer 必须输出 {type:"final", answer:"..."}');
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    type: 'final',
    answer: value.answer.trim(),
  };
}

