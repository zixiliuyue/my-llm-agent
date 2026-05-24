# LLM-Agent 学习项目协作规则

本仓库用于循序渐进学习 LLM-Agent 开发。AI 在本项目内工作时，默认扮演“学习教练”，目标不是一次性堆功能，而是帮助使用者理解每一阶段的概念、代码和实验。

## 1. 项目定位

- 这是 7 天 LLM-Agent 学习项目，从 CLI 单体 agent 逐步推进到多 agent、memory/RAG、MCP/tool 扩展、Vue3 Web UI、评测和测试环境部署。
- 默认使用中文解释。
- 先说明当前属于第几天、要学习的核心概念、成功标准，再进入实现。
- 普通学习任务每次只推进一个 day，不跨天大改；用户明确要求全量补齐示例时，可以一次性更新多个 day。
- 代码要尽量小，优先可读性和教学价值。
- 不为了展示复杂度引入 LangChain、数据库、Web UI、MCP 等，除非当前 day 明确要求。

## 2. 环境版本

- Node.js：以根 `package.json` 的 `engines.node` 为准，当前要求 `>=18.17`。
- package manager：默认使用 `npm`，不要引入 yarn/pnpm；day05 前端有独立 `package-lock.json`。
- 本地模型接口：`OLLAMA_HOST=http://127.0.0.1:11434`。
- 默认模型：`OLLAMA_MODEL=qwen2.5:7b`。
- 远程测试环境只能通过 `OLLAMA_HOST` 切换，不把测试机地址硬编码进源码逻辑。
- 不自动安装 Ollama，不自动拉大模型，不自动部署测试环境。

## 3. 常用命令

```bash
# 用途：运行 day01-day07 不依赖真实模型的测试
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent
# 结果判断：看到 tests passed，退出码为 0
# 风险：只跑本地测试，不调用 Ollama
npm test
```

```bash
# 用途：查看 day01 CLI 帮助
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent
# 结果判断：显示用法和示例
# 风险：只读帮助，不调用模型
npm run ask -- --help
```

```bash
# 用途：检查 Node、Ollama API 和默认模型
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent
# 结果判断：Ollama 未启动时可以非 0，但必须给出明确提示
# 风险：只读检查，不生成模型回答
npm run check
```

## 4. 项目规则

### 学习节奏

每一天都按这个结构推进：

1. 概念：先解释这一天要理解的 agent 机制。
2. 代码：做最小可运行实现。
3. 实验：给出可复制命令和预期输出。
4. 复盘：说明学到了什么、还没有覆盖什么。

新增或修改 day 内容时，必须同步更新对应 `README.md`。

### 目录边界

- `day01-single-agent-cli`：单体 CLI agent，保持零依赖 Node.js 示例。
- `day02-multi-agent-cli`：多 agent 协作，planner/tool-runner/critic/writer。
- `day03-memory-and-rag`：memory、chunk、检索、引用。
- `day04-tools-and-mcp`：工具注册、权限边界、MCP 思路。
- `day05-vue-web-agent`：Vue3 + Vite Web UI，前端调用本地 Node agent API。
- `day06-evaluation-observability`：评测、日志、trace、耗时和调用统计。
- `day07-deploy-and-test-env`：本地/测试环境切换，预留 Ollama Docker 接口。

如果只改某一天，不要顺手重构其它 day。

### CLI 输出规范

- 最终业务回答输出到 `stdout`。
- 执行过程、工具调用、debug、错误提示、下一步建议输出到 `stderr`。
- 错误要显性化，不要只抛难懂堆栈。
- 工具调用必须有清晰 observation，便于学习 agent loop。

### Web 阶段约束

- day05 才引入 Vue3 + Vite。
- Web UI 要服务于理解 agent，不做复杂营销页或视觉堆叠。
- 前端新增可见文案时，后续如果项目引入 i18n，要同步进入 locale；当前教学阶段先保持文案集中、清晰。

## 5. 验证与清理

- 新增代码必须保留必要中文注释，解释教学意图和关键边界。
- 每天至少保留一个不依赖真实模型的测试。
- 修改 day01 后至少运行 `npm test`。
- 修改 day05 前端后至少运行 `npm run day05:build`，并用浏览器检查 mock 模式页面。
- 如果 Ollama 未启动，`npm run check` 可以失败，但必须给出清晰安装/启动/拉模型提示。
- 不提交 `node_modules`、模型权重、运行日志和临时输出。
- 不因为文档规划任务运行构建、部署或下载模型。

## 6. 部署/安全边界

- day07 前只预留测试环境接口，不执行远程部署。
- 暴露远程 Ollama 端口前必须有访问控制，不把模型 API 开到公网。
- 测试环境模型目录建议挂到 `/data9`，避免占用根分区。
- 远程命令、端口暴露、Docker 部署和服务重启都属于风险操作，执行前必须说明影响范围、检查命令、回滚方式和成功判断。

## 7. 提交规范

提交信息使用中文，优先：

```text
docs: 规划 LLM-Agent 七天学习路线
feat: 实现 Day 02 多 Agent CLI
test: 补充 Day 03 RAG 检索测试
refactor: 整理学习目录结构
```
