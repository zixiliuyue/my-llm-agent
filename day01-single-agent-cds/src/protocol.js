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
function stripMarkdownFence(text) {
  const trimmed = String(text || '').trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fence ? fence[1].trim() : trimmed;
}

/** 从模型文本里提取第一个 JSON 对象，降低本地模型输出噪声影响。 */
function extractJsonObject(text) {
  const source = stripMarkdownFence(text);
  const start = source.indexOf('{');
  if (start < 0) {
    throw new ProtocolError('模型没有返回 JSON 对象');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  throw new ProtocolError('JSON 对象括号不完整');
}

export function parseAgentResponse(text) {
  let value;
  try {
    // 解析 JSON：把字符串还原成 JS 对象，方便后续读取字段。
    value = JSON.parse(extractJsonObject(text));
  } catch (error) {
    if (error instanceof ProtocolError) {
      throw error;
    }
    throw new ProtocolError(`JSON 解析失败: ${error.message}`);
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ProtocolError('JSON 顶层必须是对象');
  }
  return value;
}
