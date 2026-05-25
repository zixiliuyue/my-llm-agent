/**
 * Day 59：生产级 RAG / 知识库工程。
 *
 * 学习目标：把“本地 Markdown 检索”升级成可解释的 ingestion、embedding、hybrid search、rerank、
 * citation、权限过滤、缓存、增量更新和召回评估链路。默认实现全部在内存中，便于单测和 CI。
 */

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const DEFAULT_VECTOR_SIZE = 12;

/** 去掉 HTML 标签，保留可检索正文。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function parseDocument({ id, tenant = "default", type = "markdown", content, permissions = ["read:all"], updatedAt = "2026-05-25T10:00:00.000Z" }) {
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!id || typeof content !== "string") {
    // 教学：抛出错误：让调用方知道当前流程不能继续。
    throw new Error("document id 和 content 必须存在");
  }

  // 教学：定义变量：这个值后面会被更新，所以使用 let。
  let text = content;
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (type === "html") {
    text = content.replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ");
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  } else if (type === "pdf") {
    // 教学版不解析真实 PDF；这里模拟 PDF parser 的输出边界，避免单测依赖原生库。
    text = content.replace(/^%PDF-[^\n]*\n?/i, "").replace(/\bobj\b|\bendobj\b/g, " ");
  }

  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    id,
    tenant,
    type,
    permissions,
    updatedAt,
    text: text.replace(/\s+/g, " ").trim(),
  };
}

/** 按固定窗口切 chunk，记录 source offset 以便 citation 回到原文位置。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function chunkDocument(document, { size = 28, overlap = 6 } = {}) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const words = document.text.split(/\s+/).filter(Boolean);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const chunks = [];
  // 教学：定义变量：这个值后面会被更新，所以使用 let。
  let start = 0;

  // 教学：while 循环：只要条件成立就继续处理，适合解析或轮询。
  while (start < words.length) {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const end = Math.min(words.length, start + size);
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const text = words.slice(start, end).join(" ");
    chunks.push({
      id: `${document.id}#${chunks.length + 1}`,
      documentId: document.id,
      tenant: document.tenant,
      permissions: document.permissions,
      text,
      startWord: start,
      endWord: end,
      updatedAt: document.updatedAt,
    });
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (end === words.length) break;
    start = Math.max(0, end - overlap);
  }

  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return chunks;
}

/** 确定性 embedding：真实系统可替换为 OpenAI/Qwen/Ollama embedding provider。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function embedText(text, size = DEFAULT_VECTOR_SIZE) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const vector = Array.from({ length: size }, () => 0);
  // 教学：循环：按顺序处理多条数据或多个步骤。
  for (let index = 0; index < text.length; index += 1) {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const code = text.charCodeAt(index);
    vector[index % size] += ((code % 37) + 1) / 37;
  }
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return vector.map((value) => Number((value / norm).toFixed(6)));
}

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function cosine(left, right) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function keywordScore(query, text) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const terms = new Set(query.toLowerCase().split(/[^a-z0-9\u4e00-\u9fa5]+/).filter(Boolean));
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (terms.size === 0) return 0;
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const haystack = text.toLowerCase();
  // 教学：定义变量：这个值后面会被更新，所以使用 let。
  let hits = 0;
  // 教学：循环：按顺序处理多条数据或多个步骤。
  for (const term of terms) {
    // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
    if (haystack.includes(term)) hits += 1;
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return hits / terms.size;
}

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function canRead(chunk, principal) {
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (chunk.tenant !== principal.tenant) return false;
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (chunk.permissions.includes("read:all")) return true;
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return principal.groups.some((group) => chunk.permissions.includes(`group:${group}`));
}

/** 创建内存知识库；真实生产实现可把 docs/chunks/cache 换成 DB、pgvector 和 Redis。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function createKnowledgeBase({ now = () => "2026-05-25T10:00:00.000Z" } = {}) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const documents = new Map();
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const chunks = new Map();
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const cache = new Map();

  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    upsertDocument(rawDocument, options = {}) {
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const document = parseDocument({ ...rawDocument, updatedAt: rawDocument.updatedAt || now() });
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const existing = documents.get(document.id);
      // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (existing) {
        // 教学：循环：按顺序处理多条数据或多个步骤。
        for (const chunkId of existing.chunkIds) chunks.delete(chunkId);
      }
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const chunkList = chunkDocument(document, options).map((chunk) => ({
        ...chunk,
        embedding: embedText(chunk.text),
      }));
      documents.set(document.id, { ...document, chunkIds: chunkList.map((chunk) => chunk.id) });
      // 教学：循环：按顺序处理多条数据或多个步骤。
      for (const chunk of chunkList) chunks.set(chunk.id, chunk);
      cache.clear();
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return { documentId: document.id, chunks: chunkList.length, updated: Boolean(existing) };
    },

    deleteDocument(documentId) {
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const document = documents.get(documentId);
      // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (!document) return { deleted: false };
      // 教学：循环：按顺序处理多条数据或多个步骤。
      for (const chunkId of document.chunkIds) chunks.delete(chunkId);
      documents.delete(documentId);
      cache.clear();
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return { deleted: true };
    },

    search(query, principal = { tenant: "default", groups: [] }, { topK = 3, alpha = 0.68 } = {}) {
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const cacheKey = JSON.stringify({ query, principal, topK, alpha });
      // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (cache.has(cacheKey)) {
        // 教学：返回结果：调用方会拿到这个值继续后续流程。
        return { ...cache.get(cacheKey), cacheHit: true };
      }
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const queryEmbedding = embedText(query);
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const candidates = Array.from(chunks.values())
        .filter((chunk) => canRead(chunk, principal))
        .map((chunk) => {
          // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
          const vectorScore = cosine(queryEmbedding, chunk.embedding);
          // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
          const lexicalScore = keywordScore(query, chunk.text);
          // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
          const score = Number((vectorScore * alpha + lexicalScore * (1 - alpha)).toFixed(4));
          // 教学：返回结果：调用方会拿到这个值继续后续流程。
          return {
            chunkId: chunk.id,
            documentId: chunk.documentId,
            score,
            vectorScore: Number(vectorScore.toFixed(4)),
            lexicalScore: Number(lexicalScore.toFixed(4)),
            citation: `${chunk.documentId}:${chunk.startWord}-${chunk.endWord}`,
            text: chunk.text,
          };
        })
        .sort((left, right) => right.score - left.score)
        .slice(0, topK);
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const result = { query, principal, results: candidates, cacheHit: false };
      cache.set(cacheKey, result);
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return result;
    },

    evaluateRecall(cases, principal) {
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const rows = cases.map((testCase) => {
        // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
        const result = this.search(testCase.query, principal, { topK: testCase.topK || 3 });
        // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
        const found = result.results.some((item) => item.documentId === testCase.expectedDocumentId);
        // 教学：返回结果：调用方会拿到这个值继续后续流程。
        return { id: testCase.id, found, topDocument: result.results[0]?.documentId || null };
      });
      // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const hitRate = rows.filter((row) => row.found).length / rows.length;
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return { cases: rows, hitRate: Number(hitRate.toFixed(3)), passed: hitRate >= 0.8 };
    },

    snapshot() {
      // 教学：返回结果：调用方会拿到这个值继续后续流程。
      return {
        documents: documents.size,
        chunks: chunks.size,
        cacheEntries: cache.size,
      };
    },
  };
}

/** CLI demo：展示 ingestion、权限过滤、citation、缓存和召回评估的完整链路。 */
// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
export function runDemo({ mode = "demo" } = {}) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const kb = createKnowledgeBase();
  kb.upsertDocument({
    id: "runtime-runbook",
    tenant: "agent-platform",
    type: "markdown",
    permissions: ["group:ops"],
    content: "# Runtime\nAgent runtime must persist run session tool_call evidence and support cancel retry timeout recovery.",
  });
  kb.upsertDocument({
    id: "rag-guide",
    tenant: "agent-platform",
    type: "html",
    permissions: ["read:all"],
    content: "<h1>RAG</h1><p>Hybrid search combines embedding recall, keyword match, rerank, citation and permission filter.</p>",
  });
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const principal = { tenant: "agent-platform", groups: ["ops"] };
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const search = kb.search("runtime retry evidence", principal);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const cached = kb.search("runtime retry evidence", principal);
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const evaluation = kb.evaluateRecall([
    { id: "case-runtime", query: "cancel retry timeout recovery", expectedDocumentId: "runtime-runbook" },
    { id: "case-rag", query: "hybrid search citation", expectedDocumentId: "rag-guide" },
  ], principal);

  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 59,
    title: "production-rag-knowledge-base",
    localOnly: true,
    mode,
    pipeline: ["parse", "chunk", "embed", "index", "hybrid-search", "rerank", "cite", "evaluate"],
    search,
    cached,
    evaluation,
    snapshot: kb.snapshot(),
  };
}
