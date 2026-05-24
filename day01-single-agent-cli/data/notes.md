# LLM-Agent 示例知识库

## Agent Loop

Agent loop 是 LLM-Agent 的核心执行循环。典型流程是：用户提出问题，模型判断是否需要工具；如果需要工具，模型输出工具调用；程序执行工具并把 observation 回填给模型；模型基于 observation 继续推理，直到输出 final。

## Tool Calling

Tool calling 的本质是让模型不要只生成自然语言，而是生成可被程序执行的结构化动作。这个项目为了兼容本地模型，没有依赖 Ollama 原生 tools 参数，而是要求模型输出 JSON：`tool_call` 或 `final`。

## Observation

Observation 是工具执行后的结果。程序会把工具结果作为新的 user message 交给模型。模型看到 observation 后，需要继续决定下一步：继续调用工具，或者输出最终答案。

## 为什么从 CLI 学起

CLI 示例比 Web 项目更容易理解 agent 的本质，因为它没有路由、前端状态、数据库和用户系统这些干扰。先把 agent loop 看懂，再扩展到 API 服务或 Web UI 更稳。

## 本地模型和远程测试环境

本地 Mac 跑 Ollama 适合学习和调试，延迟低，迭代快。测试环境 Docker 适合后续做共享服务，但如果没有 GPU，CPU-only 推理会慢。这个项目通过 `OLLAMA_HOST` 预留了远程模型接口。
