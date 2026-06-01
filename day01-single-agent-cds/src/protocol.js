/**
 * Day 1：自包含学习源码。
 *
 * 这个文件属于 day01-single-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
export class ProtocolError extends Error {
  // 构造函数：new 这个类时会先运行这里，保存后续方法要用的状态。
  constructor(message) {
    super(message);
    this.name = 'ProtocolError';
  }
}

/** 去掉模型可能包裹的 Markdown 代码块，便于继续解析 JSON。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function stripMarkdownFence(text) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const trimmed = String(text || '').trim();
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  // 返回结果：调用方会拿到这个值继续后续流程。
  return fence ? fence[1].trim() : trimmed;
}

/** 从模型文本里提取第一个 JSON 对象，降低本地模型输出噪声影响。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function extractJsonObject(text) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const source = stripMarkdownFence(text);
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const start = source.indexOf('{');
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (start < 0) {
    // 抛出错误：让调用方知道当前流程不能继续。
    throw new ProtocolError('模型没有返回 JSON 对象');
  }

  // 定义变量：这个值后面会被更新，所以使用 let。
  let depth = 0;
  // 定义变量：这个值后面会被更新，所以使用 let。
  let inString = false;
  // 定义变量：这个值后面会被更新，所以使用 let。
  let escaped = false;
  // 循环：按顺序处理多条数据或多个步骤。
  for (let index = start; index < source.length; index += 1) {
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const char = source[index];
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (inString) {
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (char === '"') {
      inString = true;
      continue;
    }
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (depth === 0) {
        // 返回结果：调用方会拿到这个值继续后续流程。
        return source.slice(start, index + 1);
      }
    }
  }
  // 抛出错误：让调用方知道当前流程不能继续。
  throw new ProtocolError('JSON 对象括号不完整');
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function parseAgentResponse(text) {
  // 定义变量：这个值后面会被更新，所以使用 let。
  let value;
  // try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
  try {
    // 解析 JSON：把字符串还原成 JS 对象，方便后续读取字段。
    value = JSON.parse(extractJsonObject(text));
  } catch (error) {
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (error instanceof ProtocolError) {
      // 抛出错误：让调用方知道当前流程不能继续。
      throw error;
    }
    // 抛出错误：让调用方知道当前流程不能继续。
    throw new ProtocolError(`JSON 解析失败: ${error.message}`);
  }

  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    // 抛出错误：让调用方知道当前流程不能继续。
    throw new ProtocolError('JSON 顶层必须是对象');
  }
  return value;
}
