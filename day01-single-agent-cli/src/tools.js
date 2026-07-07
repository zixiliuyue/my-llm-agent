/**
 * Day 1：自包含学习源码。
 *
 * 这个文件属于 day01-single-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 读取文件：教学示例从本地 Markdown 或配置里拿数据。
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

const toolSpecs = [
  {
    name: 'current_time',
    description: '获取当前时间。input 可选 timezone，例如 Asia/Shanghai。',
    input: {
      timezone: 'string optional',
    },
  },
  {
    name: 'calculator',
    description: '计算只包含数字、括号、+、-、*、/、% 的算术表达式。',
    input: {
      expression: 'string required',
    },
  },
  {
    name: 'search_notes',
    description: '搜索本地 data/notes.md 示例知识库。',
    input: {
      query: 'string required',
    },
  },
];

/** 返回工具规格清单，供系统提示词告诉模型可用工具。 */
export function getToolSpecs() {
  return toolSpecs;
}

/** 统一包装成功工具结果，让 observation 结构保持稳定。 */
function ok(data) {
  return { ok: true, data };
}

/** 统一包装失败工具结果，让错误信息能被模型下一轮读取。 */
function fail(error) {
  return { ok: false, error };
}

/** 读取当前时间工具，保持为只读能力。 */
function getCurrentTime(input = {}) {
  const now = new Date();
  const timezone = typeof input.timezone === 'string' && input.timezone.trim()
    ? input.timezone.trim()
    : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'full',
    timeStyle: 'long',
    timeZone: timezone,
  });
  return ok({
    iso: now.toISOString(),
    timezone,
    text: formatter.format(now),
  });
}

// 定义类：这里把一组相关状态和方法封装到同一个对象里。
class ExpressionParser {
  // 构造函数：new 这个类时会先运行这里，保存后续方法要用的状态。
  constructor(expression) {
    this.expression = expression;
    this.index = 0;
  }

  parse() {
    const value = this.parseExpression();
    this.skipSpaces();
    if (this.index !== this.expression.length) {
      throw new Error(`无法解析的位置: ${this.index}`);
    }
    if (!Number.isFinite(value)) {
      throw new Error('计算结果不是有限数字');
    }
    return value;
  }

  parseExpression() {
    let value = this.parseTerm();
    // while 循环：只要条件成立就继续处理，适合解析或轮询。
    while (true) {
      this.skipSpaces();
      if (this.consume('+')) {
        value += this.parseTerm();
      } else if (this.consume('-')) {
        value -= this.parseTerm();
      } else {
        return value;
      }
    }
  }

  parseTerm() {
    let value = this.parseFactor();
    // while 循环：只要条件成立就继续处理，适合解析或轮询。
    while (true) {
      this.skipSpaces();
      if (this.consume('*')) {
        value *= this.parseFactor();
      } else if (this.consume('/')) {
        const divisor = this.parseFactor();
        if (divisor === 0) {
          throw new Error('不能除以 0');
        }
        value /= divisor;
      } else if (this.consume('%')) {
        const divisor = this.parseFactor();
        if (divisor === 0) {
          throw new Error('不能对 0 取模');
        }
        value %= divisor;
      } else {
        return value;
      }
    }
  }

  parseFactor() {
    this.skipSpaces();
    if (this.consume('+')) {
      return this.parseFactor();
    }
    if (this.consume('-')) {
      return -this.parseFactor();
    }
    if (this.consume('(')) {
      const value = this.parseExpression();
      this.skipSpaces();
      if (!this.consume(')')) {
        throw new Error('缺少右括号');
      }
      return value;
    }
    return this.parseNumber();
  }

  parseNumber() {
    this.skipSpaces();
    const match = /^[0-9]+(?:\.[0-9]+)?/.exec(this.expression.slice(this.index));
    if (!match) {
      throw new Error(`需要数字，位置: ${this.index}`);
    }
    this.index += match[0].length;
    return Number(match[0]);
  }

  consume(char) {
    if (this.expression[this.index] === char) {
      this.index += 1;
      return true;
    }
    return false;
  }

  skipSpaces() {
    // while 循环：只要条件成立就继续处理，适合解析或轮询。
    while (/\s/.test(this.expression[this.index] || '')) {
      this.index += 1;
    }
  }
}

/** 执行受限计算工具，只允许安全字符组成的表达式。 */
function calculate(input = {}) {
  const expression = input.expression;
  if (typeof expression !== 'string' || !expression.trim()) {
    return fail('calculator 需要 input.expression');
  }
  if (!/^[0-9+\-*/%().\s]+$/.test(expression)) {
    return fail('表达式包含不允许的字符，只允许数字、括号、+、-、*、/、%');
  }
  try {
    return ok({
      expression,
      value: new ExpressionParser(expression).parse(),
    });
  } catch (error) {
    return fail(error.message);
  }
}

/** 计算 chunk 与查询的关键词重合度。 */
function scoreChunk(chunk, terms) {
  const lower = chunk.toLowerCase();
  return terms.reduce((score, term) => score + (lower.includes(term) ? 1 : 0), 0);
}

/** 在本地 notes 中检索知识片段，模拟最小 RAG 工具。 */
async function searchNotes(input = {}) {
  const query = input.query;
  if (typeof query !== 'string' || !query.trim()) {
    return fail('search_notes 需要 input.query');
  }
  const notesPath = resolve(PROJECT_ROOT, 'data/notes.md');
  // 读取文件：教学示例从本地 Markdown 或配置里拿数据。
  const content = await readFile(notesPath, 'utf8');
  const terms = query
    .toLowerCase()
    .split(/[\s,，。:：;；]+/)
    .map((term) => term.trim())
    .filter(Boolean);
  const chunks = content
    .split(/\n(?=## )/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, terms) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.chunk);

  return ok({
    query,
    matches: chunks,
    fallback: chunks.length === 0 ? content.slice(0, 600) : undefined,
  });
}

/** 按工具名分发执行，并统一返回 observation 友好的结果。 */
// 导出异步函数：调用方需要 await 它，因为内部可能读文件、请求接口或等待模型。
export async function runTool(name, input) {
  // switch 分发：根据一个固定字段选择要执行的工具或分支。
  switch (name) {
    // case 分支：匹配到这个值时执行对应逻辑。
    case 'current_time':
      return getCurrentTime(input);
    // case 分支：匹配到这个值时执行对应逻辑。
    case 'calculator':
      return calculate(input);
    // case 分支：匹配到这个值时执行对应逻辑。
    case 'search_notes':
      return searchNotes(input);
    // default 分支：没有任何 case 匹配时走这里，通常用于报错或兜底。
    default:
      return fail(`未知工具: ${name}。可用工具: ${toolSpecs.map((tool) => tool.name).join(', ')}`);
  }
}
