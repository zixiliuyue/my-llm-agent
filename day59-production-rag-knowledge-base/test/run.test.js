/**
 * Day 59 测试：验证 RAG pipeline 的权限、缓存、增量更新、删除和召回评估边界。
 */
import assert from "node:assert/strict";
import { chunkDocument, createKnowledgeBase, embedText, parseDocument, runDemo } from "../src/index.js";

const parsed = parseDocument({ id: "html", type: "html", content: "<h1>Hello</h1><script>bad()</script><p>Agent RAG</p>" });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(parsed.text, "Hello Agent RAG");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(chunkDocument(parsed, { size: 2, overlap: 1 }).length, 2);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(embedText("same").join(","), embedText("same").join(","));

const kb = createKnowledgeBase();
kb.upsertDocument({
  id: "ops",
  tenant: "t1",
  permissions: ["group:ops"],
  content: "runtime retry timeout recovery evidence board",
});
kb.upsertDocument({
  id: "public",
  tenant: "t1",
  permissions: ["read:all"],
  content: "hybrid search citation rerank cache",
});

const denied = kb.search("runtime", { tenant: "t1", groups: ["guest"] });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(denied.results.some((item) => item.documentId === "ops"), false);

const allowed = kb.search("runtime retry", { tenant: "t1", groups: ["ops"] });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(allowed.results[0].documentId, "ops");
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.match(allowed.results[0].citation, /^ops:/);

const cached = kb.search("runtime retry", { tenant: "t1", groups: ["ops"] });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(cached.cacheHit, true);

kb.upsertDocument({
  id: "ops",
  tenant: "t1",
  permissions: ["group:ops"],
  content: "new content only mentions sandbox",
});
const updated = kb.search("runtime retry", { tenant: "t1", groups: ["ops"] });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.notEqual(updated.results[0]?.documentId, "ops");

// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.deepEqual(kb.deleteDocument("public"), { deleted: true });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(kb.snapshot().documents, 1);

const evalKb = createKnowledgeBase();
evalKb.upsertDocument({ id: "rag", tenant: "t1", content: "hybrid search citation permission filter" });
const evaluation = evalKb.evaluateRecall([
  { id: "rag-case", query: "hybrid citation", expectedDocumentId: "rag" },
], { tenant: "t1", groups: [] });
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(evaluation.passed, true);

const demo = runDemo();
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.day, 59);
// 测试断言：确认核心行为符合预期，失败时会抛出明确错误。
assert.equal(demo.evaluation.passed, true);

console.log("day59 tests passed");
