/**
 * Day 3：自包含学习源码。
 *
 * 这个文件属于 day03-memory-and-rag，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function tokenize(text) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return String(text || '')
    .toLowerCase()
    .split(/[\s,，。:：;；、()（）"']+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

/** 计算 chunk 与查询的关键词重合度。 */
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function scoreChunk(query, chunk) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const terms = tokenize(query);
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const haystack = `${chunk.title}\n${chunk.text}`.toLowerCase();
  // 返回结果：调用方会拿到这个值继续后续流程。
  return terms.reduce((score, term) => {
    // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (!term) {
      // 返回结果：调用方会拿到这个值继续后续流程。
      return score;
    }
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const titleBonus = chunk.title.toLowerCase().includes(term) ? 2 : 0;
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const bodyBonus = haystack.includes(term) ? 1 : 0;
    // 返回结果：调用方会拿到这个值继续后续流程。
    return score + titleBonus + bodyBonus;
  }, 0);
}

/** 按分数排序返回最相关的知识片段。 */
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function retrieve(query, chunks, { limit = 3 } = {}) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return chunks
    .map((chunk) => ({ ...chunk, score: scoreChunk(query, chunk) }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

