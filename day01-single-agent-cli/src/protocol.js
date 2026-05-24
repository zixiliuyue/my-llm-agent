/**
 * Day 1：自包含学习源码。
 *
 * 这个文件属于 day01-single-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
export class ProtocolError extends Error {
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

/** 校验单体 agent 的 JSON 协议，只允许 tool_call 或 final。 */
export function parseAgentResponse(text) {
  let value;
  try {
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
  if (value.type === 'final') {
    if (typeof value.answer !== 'string' || !value.answer.trim()) {
      throw new ProtocolError('final 需要非空字符串 answer');
    }
    return {
      type: 'final',
      answer: value.answer.trim(),
    };
  }
  if (value.type === 'tool_call') {
    if (typeof value.tool !== 'string' || !value.tool.trim()) {
      throw new ProtocolError('tool_call 需要非空字符串 tool');
    }
    if (value.input != null && (typeof value.input !== 'object' || Array.isArray(value.input))) {
      throw new ProtocolError('tool_call.input 必须是对象');
    }
    return {
      type: 'tool_call',
      tool: value.tool.trim(),
      input: value.input || {},
    };
  }

  throw new ProtocolError('type 必须是 tool_call 或 final');
}
