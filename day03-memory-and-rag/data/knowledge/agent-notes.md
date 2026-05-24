# LLM-Agent 学习笔记

## agent loop

Agent loop 是“模型判断下一步 -> 执行工具 -> observation 回填 -> 模型继续判断”的循环。它的关键不是一次生成很长答案，而是让模型在每轮都基于最新观察结果行动。

## memory

Memory 是 agent 可以跨轮次或跨任务保留的信息。教学项目里先用本地 Markdown 模拟 memory，避免一开始就引入数据库。

## rag

RAG 是 retrieval augmented generation。它先从资料库检索相关片段，再把片段交给模型或回答器使用。RAG 的重点是 grounding 和 citation：回答应该基于检索内容，并说明来源。

