/**
 * Day 3：自包含学习源码。
 *
 * 这个文件属于 day03-memory-and-rag，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[\s,，。:：;；、()（）"']+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

export function scoreChunk(query, chunk) {
  const terms = tokenize(query);
  const haystack = `${chunk.title}\n${chunk.text}`.toLowerCase();
  return terms.reduce((score, term) => {
    if (!term) {
      return score;
    }
    const titleBonus = chunk.title.toLowerCase().includes(term) ? 2 : 0;
    const bodyBonus = haystack.includes(term) ? 1 : 0;
    return score + titleBonus + bodyBonus;
  }, 0);
}

export function retrieve(query, chunks, { limit = 3 } = {}) {
  return chunks
    .map((chunk) => ({ ...chunk, score: scoreChunk(query, chunk) }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

