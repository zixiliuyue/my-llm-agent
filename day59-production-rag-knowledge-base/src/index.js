/**
 * Day 59：生产级 RAG / 知识库工程。
 *
 * 学习目标：把“本地 Markdown 检索”升级成可解释的 ingestion、embedding、hybrid search、rerank、
 * citation、权限过滤、缓存、增量更新和召回评估链路。默认实现全部在内存中，便于单测和 CI。
 */

const DEFAULT_VECTOR_SIZE = 12;

/** 去掉 HTML 标签，保留可检索正文。 */
export function parseDocument({ id, tenant = "default", type = "markdown", content, permissions = ["read:all"], updatedAt = "2026-05-25T10:00:00.000Z" }) {
  if (!id || typeof content !== "string") {
    throw new Error("document id 和 content 必须存在");
  }

  let text = content;
  if (type === "html") {
    text = content.replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ");
  } else if (type === "pdf") {
    // 教学版不解析真实 PDF；这里模拟 PDF parser 的输出边界，避免单测依赖原生库。
    text = content.replace(/^%PDF-[^\n]*\n?/i, "").replace(/\bobj\b|\bendobj\b/g, " ");
  }

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
export function chunkDocument(document, { size = 28, overlap = 6 } = {}) {
  const words = document.text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let start = 0;

  // while 循环：只要条件成立就继续处理，适合解析或轮询。
  while (start < words.length) {
    const end = Math.min(words.length, start + size);
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
    if (end === words.length) break;
    start = Math.max(0, end - overlap);
  }

  return chunks;
}

/** 确定性 embedding：真实系统可替换为 OpenAI/Qwen/Ollama embedding provider。 */
export function embedText(text, size = DEFAULT_VECTOR_SIZE) {
  const vector = Array.from({ length: size }, () => 0);
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    vector[index % size] += ((code % 37) + 1) / 37;
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / norm).toFixed(6)));
}

function cosine(left, right) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function keywordScore(query, text) {
  const terms = new Set(query.toLowerCase().split(/[^a-z0-9\u4e00-\u9fa5]+/).filter(Boolean));
  if (terms.size === 0) return 0;
  const haystack = text.toLowerCase();
  let hits = 0;
  for (const term of terms) {
    if (haystack.includes(term)) hits += 1;
  }
  return hits / terms.size;
}

function canRead(chunk, principal) {
  if (chunk.tenant !== principal.tenant) return false;
  if (chunk.permissions.includes("read:all")) return true;
  return principal.groups.some((group) => chunk.permissions.includes(`group:${group}`));
}

/** 创建内存知识库；真实生产实现可把 docs/chunks/cache 换成 DB、pgvector 和 Redis。 */
export function createKnowledgeBase({ now = () => "2026-05-25T10:00:00.000Z" } = {}) {
  const documents = new Map();
  const chunks = new Map();
  const cache = new Map();

  return {
    upsertDocument(rawDocument, options = {}) {
      const document = parseDocument({ ...rawDocument, updatedAt: rawDocument.updatedAt || now() });
      const existing = documents.get(document.id);
      if (existing) {
        for (const chunkId of existing.chunkIds) chunks.delete(chunkId);
      }
      const chunkList = chunkDocument(document, options).map((chunk) => ({
        ...chunk,
        embedding: embedText(chunk.text),
      }));
      documents.set(document.id, { ...document, chunkIds: chunkList.map((chunk) => chunk.id) });
      for (const chunk of chunkList) chunks.set(chunk.id, chunk);
      cache.clear();
      return { documentId: document.id, chunks: chunkList.length, updated: Boolean(existing) };
    },

    deleteDocument(documentId) {
      const document = documents.get(documentId);
      if (!document) return { deleted: false };
      for (const chunkId of document.chunkIds) chunks.delete(chunkId);
      documents.delete(documentId);
      cache.clear();
      return { deleted: true };
    },

    search(query, principal = { tenant: "default", groups: [] }, { topK = 3, alpha = 0.68 } = {}) {
      const cacheKey = JSON.stringify({ query, principal, topK, alpha });
      if (cache.has(cacheKey)) {
        return { ...cache.get(cacheKey), cacheHit: true };
      }
      const queryEmbedding = embedText(query);
      const candidates = Array.from(chunks.values())
        .filter((chunk) => canRead(chunk, principal))
        .map((chunk) => {
          const vectorScore = cosine(queryEmbedding, chunk.embedding);
          const lexicalScore = keywordScore(query, chunk.text);
          const score = Number((vectorScore * alpha + lexicalScore * (1 - alpha)).toFixed(4));
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
      const result = { query, principal, results: candidates, cacheHit: false };
      cache.set(cacheKey, result);
      return result;
    },

    evaluateRecall(cases, principal) {
      const rows = cases.map((testCase) => {
        const result = this.search(testCase.query, principal, { topK: testCase.topK || 3 });
        const found = result.results.some((item) => item.documentId === testCase.expectedDocumentId);
        return { id: testCase.id, found, topDocument: result.results[0]?.documentId || null };
      });
      const hitRate = rows.filter((row) => row.found).length / rows.length;
      return { cases: rows, hitRate: Number(hitRate.toFixed(3)), passed: hitRate >= 0.8 };
    },

    snapshot() {
      return {
        documents: documents.size,
        chunks: chunks.size,
        cacheEntries: cache.size,
      };
    },
  };
}

/** CLI demo：展示 ingestion、权限过滤、citation、缓存和召回评估的完整链路。 */
export function runDemo({ mode = "demo" } = {}) {
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
  const principal = { tenant: "agent-platform", groups: ["ops"] };
  const search = kb.search("runtime retry evidence", principal);
  const cached = kb.search("runtime retry evidence", principal);
  const evaluation = kb.evaluateRecall([
    { id: "case-runtime", query: "cancel retry timeout recovery", expectedDocumentId: "runtime-runbook" },
    { id: "case-rag", query: "hybrid search citation", expectedDocumentId: "rag-guide" },
  ], principal);

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
