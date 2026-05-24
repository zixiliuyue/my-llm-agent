# LLM-Agent 学习项目

这个仓库按 7 天路线组织，从最小 CLI agent 开始，逐步学习多 agent、memory/RAG、工具系统、MCP 思路、Vue3 Web UI、评测和测试环境部署。每一天都有可运行示例代码和不依赖真实模型的测试。

## 学习路线

| Day | 目录 | 主题 | 运行入口 |
|---|---|---|---|
| 01 | `day01-single-agent-cli` | 单体 agent loop + 工具调用 | `npm run day01:ask -- "计算 (18+24)*3"` |
| 02 | `day02-multi-agent-cli` | planner/tool-runner/critic/writer 多 agent 协作 | `npm run day02:ask -- "计算 (18+24)*3"` |
| 03 | `day03-memory-and-rag` | 本地 memory、chunk、检索、引用 | `npm run day03:ask -- "什么是 agent loop"` |
| 04 | `day04-tools-and-mcp` | 工具注册、权限边界、MCP mock | `npm run day04:tools -- --list` |
| 05 | `day05-vue-web-agent` | Vue3 + Vite Web UI + Node agent API | `AGENT_MOCK=1 npm run day05:api` 和 `npm run day05:web` |
| 06 | `day06-evaluation-observability` | eval cases、trace、耗时和调用统计 | `npm run day06:eval` |
| 07 | `day07-deploy-and-test-env` | 本地/测试环境切换和部署 dry-run | `npm run day07:dry-run -- --port 11434 --model-dir /data9/ollama` |

## 快速验证

```bash
# 用途：运行 day01-day07 的 mock/unit 测试
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent
# 参数含义：无
# 输出判断：每个 day 打印 tests passed，最终退出码为 0
# 风险：不调用 Ollama，不部署，不拉模型
npm test
```

```bash
# 用途：检查 Node、Ollama API、默认模型是否可用
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent
# 参数含义：无
# 输出判断：看到“自检通过”；如果 Ollama 未启动，会给出启动和拉模型提示
# 风险：只读检查，不会调用模型生成内容
npm run check
```

## 本地模型默认值

```bash
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
```

后续如果测试环境 Docker 暴露 Ollama 端口，只需要显式切换环境变量：

```bash
OLLAMA_HOST=http://<test-host>:11434 OLLAMA_MODEL=qwen2.5:7b npm run day01:ask -- "什么是 agent loop"
```

不要把测试环境地址写进源码。测试环境建议把模型目录挂到 `/data9`，不要用根分区；没有 NVIDIA GPU 时，CPU-only 推理会比较慢。

## Day 05 Web 运行

首次运行前安装前端依赖：

```bash
# 用途：安装 day05 Vue3 + Vite 前端依赖
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent
# 输出判断：生成/复用 day05-vue-web-agent/frontend/node_modules
# 风险：会下载 npm 依赖，不提交 node_modules
npm --prefix day05-vue-web-agent/frontend install
```

```bash
# 用途：启动本地 Agent API，使用 mock 模式避免依赖 Ollama
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent
# 输出判断：监听 http://127.0.0.1:8787
# 风险：只启动本机服务，不访问远程环境
AGENT_MOCK=1 npm run day05:api
```

```bash
# 用途：启动 Vue3 + Vite 前端
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent
# 输出判断：Vite 输出本地访问地址，默认端口 5175
# 风险：只启动本机开发服务
npm run day05:web
```

## 学习方式

每一天都按四步走：

1. 概念：理解今天要解决的 agent 问题。
2. 代码：阅读或实现最小可运行版本。
3. 实验：运行 README 中的命令，观察 stdout/stderr。
4. 复盘：记录这一天学到了什么，以及下一天为什么需要新增能力。

根目录 `AGENTS.md` 定义了后续 AI 在本仓库内的学习教练规则。
