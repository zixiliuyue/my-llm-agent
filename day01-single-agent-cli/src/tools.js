/**
 * Day 1：自包含学习源码。
 *
 * 这个文件属于 day01-single-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
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

export function getToolSpecs() {
  return toolSpecs;
}

function ok(data) {
  return { ok: true, data };
}

function fail(error) {
  return { ok: false, error };
}

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

class ExpressionParser {
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
    while (/\s/.test(this.expression[this.index] || '')) {
      this.index += 1;
    }
  }
}

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

function scoreChunk(chunk, terms) {
  const lower = chunk.toLowerCase();
  return terms.reduce((score, term) => score + (lower.includes(term) ? 1 : 0), 0);
}

async function searchNotes(input = {}) {
  const query = input.query;
  if (typeof query !== 'string' || !query.trim()) {
    return fail('search_notes 需要 input.query');
  }
  const notesPath = resolve(PROJECT_ROOT, 'data/notes.md');
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

export async function runTool(name, input) {
  switch (name) {
    case 'current_time':
      return getCurrentTime(input);
    case 'calculator':
      return calculate(input);
    case 'search_notes':
      return searchNotes(input);
    default:
      return fail(`未知工具: ${name}。可用工具: ${toolSpecs.map((tool) => tool.name).join(', ')}`);
  }
}
