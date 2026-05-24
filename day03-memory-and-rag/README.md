# Day 03：Memory 与 RAG

第三天学习如何让 agent 不只依赖 prompt 里的上下文，而是从本地资料中检索相关内容，再带着引用回答。

## 学习目标

- 理解 memory、notes、RAG 的区别。
- 把 day01 的 `search_notes` 从简单字符串匹配升级为 chunk 检索。
- 学会在最终回答中说明信息来自哪个 chunk。

## 核心概念

- chunk：把长文档切成较小片段。
- retrieval：根据用户问题找最相关的片段。
- grounding：模型回答必须基于检索到的片段，不编造。
- citation：回答中给出来源，方便 review。

## 建议实现步骤

1. 增加 `data/knowledge/` 示例资料。
2. 写一个不依赖模型的 chunker。
3. 写一个简单 BM25 或关键词打分检索器。
4. 把检索结果作为 observation 回填给 agent。
5. 要求 final answer 带引用片段标题。

## 验收标准

- 本地测试不调用 Ollama，也能验证 chunk 和检索排序。
- 问“agent loop 是什么”时，答案来自知识库片段。
- 找不到资料时，agent 必须说明没有检索到可靠内容。

## 常见坑

- 不要一开始就上向量数据库。
- 不要把整篇文档塞进 prompt。
- 不要让模型自己决定引用来源，来源要来自检索结果。
