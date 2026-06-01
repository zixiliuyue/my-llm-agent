/**
 * Day 1：自包含学习源码。
 *
 * 这个文件属于 day01-single-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 读取文件：教学示例从本地 Markdown 或配置里拿数据。
import { readFile } from 'node:fs/promises';
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { dirname, resolve } from 'node:path';
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { fileURLToPath } from 'node:url';

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const __dirname = dirname(fileURLToPath(import.meta.url));
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const PROJECT_ROOT = resolve(__dirname, '..');

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
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
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function getToolSpecs() {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return toolSpecs;
}

/** 统一包装成功工具结果，让 observation 结构保持稳定。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function ok(data) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return { ok: true, data };
}

/** 统一包装失败工具结果，让错误信息能被模型下一轮读取。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function fail(error) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return { ok: false, error };
}

/** 读取当前时间工具，保持为只读能力。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function getCurrentTime(input = {}) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const now = new Date();
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const timezone = typeof input.timezone === 'string' && input.timezone.trim()
    ? input.timezone.trim()
    : Intl.DateTimeFormat().resolvedOptions().timeZone;
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'full',
    timeStyle: 'long',
    timeZone: timezone,
  });
  // 返回结果：调用方会拿到这个值继续后续流程。
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
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const value = this.parseExpression();
    this.skipSpaces();
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (this.index !== this.expression.length) {
      // 抛出错误：让调用方知道当前流程不能继续。
      throw new Error(`无法解析的位置: ${this.index}`);
    }
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!Number.isFinite(value)) {
      // 抛出错误：让调用方知道当前流程不能继续。
      throw new Error('计算结果不是有限数字');
    }
    // 返回结果：调用方会拿到这个值继续后续流程。
    return value;
  }

  parseExpression() {
    // 定义变量：这个值后面会被更新，所以使用 let。
    let value = this.parseTerm();
    // while 循环：只要条件成立就继续处理，适合解析或轮询。
    while (true) {
      this.skipSpaces();
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (this.consume('+')) {
        value += this.parseTerm();
      } else if (this.consume('-')) {
        value -= this.parseTerm();
      } else {
        // 返回结果：调用方会拿到这个值继续后续流程。
        return value;
      }
    }
  }

  parseTerm() {
    // 定义变量：这个值后面会被更新，所以使用 let。
    let value = this.parseFactor();
    // while 循环：只要条件成立就继续处理，适合解析或轮询。
    while (true) {
      this.skipSpaces();
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (this.consume('*')) {
        value *= this.parseFactor();
      } else if (this.consume('/')) {
        // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
        const divisor = this.parseFactor();
        // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
        if (divisor === 0) {
          // 抛出错误：让调用方知道当前流程不能继续。
          throw new Error('不能除以 0');
        }
        value /= divisor;
      } else if (this.consume('%')) {
        // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
        const divisor = this.parseFactor();
        // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
        if (divisor === 0) {
          // 抛出错误：让调用方知道当前流程不能继续。
          throw new Error('不能对 0 取模');
        }
        value %= divisor;
      } else {
        // 返回结果：调用方会拿到这个值继续后续流程。
        return value;
      }
    }
  }

  parseFactor() {
    this.skipSpaces();
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (this.consume('+')) {
      // 返回结果：调用方会拿到这个值继续后续流程。
      return this.parseFactor();
    }
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (this.consume('-')) {
      // 返回结果：调用方会拿到这个值继续后续流程。
      return -this.parseFactor();
    }
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (this.consume('(')) {
      // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const value = this.parseExpression();
      this.skipSpaces();
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (!this.consume(')')) {
        // 抛出错误：让调用方知道当前流程不能继续。
        throw new Error('缺少右括号');
      }
      // 返回结果：调用方会拿到这个值继续后续流程。
      return value;
    }
    // 返回结果：调用方会拿到这个值继续后续流程。
    return this.parseNumber();
  }

  parseNumber() {
    this.skipSpaces();
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const match = /^[0-9]+(?:\.[0-9]+)?/.exec(this.expression.slice(this.index));
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!match) {
      // 抛出错误：让调用方知道当前流程不能继续。
      throw new Error(`需要数字，位置: ${this.index}`);
    }
    this.index += match[0].length;
    // 返回结果：调用方会拿到这个值继续后续流程。
    return Number(match[0]);
  }

  consume(char) {
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (this.expression[this.index] === char) {
      this.index += 1;
      // 返回结果：调用方会拿到这个值继续后续流程。
      return true;
    }
    // 返回结果：调用方会拿到这个值继续后续流程。
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
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function calculate(input = {}) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const expression = input.expression;
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (typeof expression !== 'string' || !expression.trim()) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return fail('calculator 需要 input.expression');
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!/^[0-9+\-*/%().\s]+$/.test(expression)) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return fail('表达式包含不允许的字符，只允许数字、括号、+、-、*、/、%');
  }
  // try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
  try {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return ok({
      expression,
      value: new ExpressionParser(expression).parse(),
    });
  } catch (error) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return fail(error.message);
  }
}

/** 计算 chunk 与查询的关键词重合度。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function scoreChunk(chunk, terms) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const lower = chunk.toLowerCase();
  // 返回结果：调用方会拿到这个值继续后续流程。
  return terms.reduce((score, term) => score + (lower.includes(term) ? 1 : 0), 0);
}

/** 在本地 notes 中检索知识片段，模拟最小 RAG 工具。 */
// 异步函数：里面会 await 异步操作，所以调用时也要等待结果。
async function searchNotes(input = {}) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const query = input.query;
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (typeof query !== 'string' || !query.trim()) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return fail('search_notes 需要 input.query');
  }
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const notesPath = resolve(PROJECT_ROOT, 'data/notes.md');
  // 读取文件：教学示例从本地 Markdown 或配置里拿数据。
  const content = await readFile(notesPath, 'utf8');
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const terms = query
    .toLowerCase()
    .split(/[\s,，。:：;；]+/)
    .map((term) => term.trim())
    .filter(Boolean);
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const chunks = content
    .split(/\n(?=## )/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, terms) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.chunk);

  // 返回结果：调用方会拿到这个值继续后续流程。
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
      // 返回结果：调用方会拿到这个值继续后续流程。
      return getCurrentTime(input);
    // case 分支：匹配到这个值时执行对应逻辑。
    case 'calculator':
      // 返回结果：调用方会拿到这个值继续后续流程。
      return calculate(input);
    // case 分支：匹配到这个值时执行对应逻辑。
    case 'search_notes':
      // 返回结果：调用方会拿到这个值继续后续流程。
      return searchNotes(input);
    // default 分支：没有任何 case 匹配时走这里，通常用于报错或兜底。
    default:
      // 返回结果：调用方会拿到这个值继续后续流程。
      return fail(`未知工具: ${name}。可用工具: ${toolSpecs.map((tool) => tool.name).join(', ')}`);
  }
}
