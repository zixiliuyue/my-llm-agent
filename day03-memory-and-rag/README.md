# Day 03：Memory 与 RAG

第三天学习如何让 agent 从本地资料中检索相关内容，再带着引用回答。

## 概念

- chunk：把长文档切成较小片段。
- retrieval：根据用户问题找最相关的片段。
- grounding：回答基于检索内容，不编造。
- citation：最终答案带来源，方便复核。

## 运行

```bash
# 用途：用本地知识库回答问题
# 执行目录：<项目根目录>
# 参数含义：-- 后面是用户问题
# 输出判断：stderr 展示命中的 chunk，stdout 输出带引用的答案
# 风险：只读取本地 Markdown，不调用 Ollama
npm run day03:ask -- "什么是 agent loop"
```

```bash
# 用途：测试 chunk、检索排序和无命中 fallback
# 执行目录：<项目根目录>
# 输出判断：看到 day03 tests passed
# 风险：只跑本地测试
npm run day03:test
```

## 代码入口

- `data/knowledge/agent-notes.md`：示例知识库。
- `src/chunker.js`：Markdown 分块。
- `src/retriever.js`：关键词打分检索。
- `src/rag-agent.js`：组合答案和引用。

## 复盘

RAG 的重点不是把整篇文档塞进 prompt，而是先找相关片段，再让回答和来源保持可复核。
