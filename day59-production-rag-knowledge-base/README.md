# Day 59 - Production RAG Knowledge Base

## 概念

这一日把 day03 的本地 Markdown 检索升级成生产 RAG 链路：解析、chunk、embedding、index、hybrid search、rerank、citation、权限过滤、缓存、增量更新、删除和召回评估。

## 代码结构

- `src/index.js`：内存知识库、确定性 embedding、hybrid search 和 eval。
- `src/cli.js`：输出结构化 JSON demo。
- `test/run.test.js`：覆盖权限、缓存、更新、删除和 recall。

## 运行

```bash
# 用途：运行 day59 RAG demo
# 执行目录：项目根目录
# 结果判断：stdout 输出 day=59 JSON，evaluation.passed=true
# 风险：只使用内存数据，不连接真实向量库
npm run day59:rag
```

## Docker / pgvector 草案

真实服务可把内存 chunks 换成：

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE rag_chunks (
  id text PRIMARY KEY,
  document_id text NOT NULL,
  tenant text NOT NULL,
  permissions text[] NOT NULL,
  content text NOT NULL,
  embedding vector(12) NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX rag_chunks_embedding_idx ON rag_chunks USING ivfflat (embedding vector_cosine_ops);
```

## 实验

1. 把 `alpha` 从 `0.68` 改成 `0.3`，观察关键词召回权重变大。
2. 新增一个 `group:finance` 文档，验证非 finance 用户无法检索。
3. 修改同一个 document id，确认旧 chunks 被替换而不是叠加。

## 复盘

- embedding 只负责候选召回，权限过滤必须由确定性代码执行。
- citation 必须能追溯到 chunk/source offset，不能只返回模型总结。
- CI eval 不应依赖外部向量库；生产连接放到显式 Docker/集成测试。
