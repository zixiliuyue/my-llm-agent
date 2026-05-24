# LLM-Agent 学习项目

这个仓库按 7 天路线组织，从最小 CLI agent 开始，逐步学习多 agent、memory/RAG、工具系统、MCP 思路、Vue3 Web UI、评测和测试环境部署。

## 学习路线

| Day | 目录 | 主题 | 当前状态 |
|---|---|---|---|
| 01 | `day01-single-agent-cli` | 单体 agent loop + 工具调用 | 已实现，可运行 |
| 02 | `day02-multi-agent-cli` | 多 agent 协作 | 已规划，待实现 |
| 03 | `day03-memory-and-rag` | memory、chunk、检索、引用 | 已规划，待实现 |
| 04 | `day04-tools-and-mcp` | 工具注册、权限边界、MCP 思路 | 已规划，待实现 |
| 05 | `day05-vue-web-agent` | Vue3 + Vite Web UI | 已规划，待实现 |
| 06 | `day06-evaluation-observability` | 评测、日志、trace、耗时统计 | 已规划，待实现 |
| 07 | `day07-deploy-and-test-env` | 本地/测试环境切换和部署边界 | 已规划，待实现 |

## 运行 Day 01

```bash
# 用途：检查 Node、Ollama API、默认模型是否可用
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent
# 参数含义：无
# 输出判断：看到“自检通过”；如果 Ollama 未启动，会给出启动和拉模型提示
# 风险：只读检查，不会调用模型生成内容
npm run check
```

```bash
# 用途：运行第一天单体 agent 示例
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent
# 参数含义：-- 后面是用户问题
# 输出判断：stderr 打印工具调用过程，stdout 输出最终答案
# 风险：会调用本地或 OLLAMA_HOST 指向的模型服务
npm run ask -- "计算 (18+24)*3"
```

```bash
# 用途：运行不依赖真实模型的测试
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent
# 参数含义：无
# 输出判断：看到 tests passed
# 风险：只跑本地单元测试，不调用 Ollama
npm test
```

## 本地模型默认值

```bash
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
```

后续如果测试环境 Docker 暴露 Ollama 端口，只需要切换：

```bash
OLLAMA_HOST=http://127.0.0.1:<port> OLLAMA_MODEL=qwen2.5:7b npm run ask -- "什么是 agent loop"
```

测试环境建议把模型目录挂到 `/data9`，不要用根分区；测试机没有 NVIDIA GPU 时，CPU-only 推理会比较慢。

## 学习方式

每一天都按四步走：

1. 概念：理解今天要解决的 agent 问题。
2. 代码：阅读或实现最小可运行版本。
3. 实验：运行 README 中的命令，观察 stdout/stderr。
4. 复盘：记录这一天学到了什么，以及下一天为什么需要新增能力。

## 给 AI Agent 的协作规则

本仓库根目录有 `AGENTS.md`。后续让 AI 继续改这个项目时，应该先读 `AGENTS.md` 和对应 day 的 README，再做最小改动。
