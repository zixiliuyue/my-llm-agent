# Day 01：本地单体 LLM-Agent CLI

这是第一天的学习示例：一个零依赖 Node.js CLI，用本地 Ollama 模型学习 LLM-Agent 的基本开发方式。

核心目标：

- 看懂 agent loop。
- 看懂工具调用和 observation 回填。
- 看懂如何从本地模型切换到测试环境模型接口。

## 1. 环境要求

- Node.js 18.17 或更高版本。
- Ollama 本地服务。
- 一个本地模型，默认 `qwen2.5:7b`。

当前项目不自动安装 Ollama，也不自动拉模型。

## 2. 安装 Ollama 和模型

macOS 可以用官网安装包：

```bash
# 用途：打开 Ollama 下载页
# 执行目录：任意目录
# 参数含义：无
# 输出判断：浏览器打开 Ollama 下载页面
# 风险：只打开网页，不改系统配置
open https://ollama.com/download
```

安装后启动服务：

```bash
# 用途：启动本地 Ollama API 服务
# 执行目录：任意目录
# 参数含义：无
# 输出判断：服务监听 http://127.0.0.1:11434
# 风险：会在本机启动常驻服务，占用本地资源
ollama serve
```

另开一个终端拉模型：

```bash
# 用途：下载默认学习模型
# 执行目录：任意目录
# 参数含义：qwen2.5:7b 是默认模型名
# 输出判断：模型下载完成，ollama list 可以看到 qwen2.5:7b
# 风险：会占用数 GB 磁盘空间和网络流量
ollama pull qwen2.5:7b
```

## 3. 自检

```bash
# 用途：检查 Node、Ollama API、默认模型是否可用
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent/day01-single-agent-cli
# 参数含义：无
# 输出判断：看到“自检通过”
# 风险：只读检查，不会调用模型生成内容
npm run check
```

如果 Ollama 没启动，会提示执行：

```bash
ollama serve
ollama pull qwen2.5:7b
```

## 4. 运行示例

```bash
# 用途：让 agent 调用 calculator 工具
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent/day01-single-agent-cli
# 参数含义：-- 后面是用户问题
# 输出判断：stderr 能看到工具调用过程，stdout 输出最终答案
# 风险：会调用本地模型，占用 CPU/GPU/内存
npm run ask -- "计算 (18+24)*3"
```

```bash
# 用途：让 agent 调用 current_time 工具
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent/day01-single-agent-cli
# 参数含义：-- 后面是用户问题
# 输出判断：最终答案包含当前时间
# 风险：会调用本地模型
npm run ask -- "现在几点"
```

```bash
# 用途：让 agent 搜索本地知识库
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent/day01-single-agent-cli
# 参数含义：-- 后面是用户问题
# 输出判断：最终答案解释 agent loop
# 风险：会调用本地模型，只读取 data/notes.md
npm run ask -- "什么是 agent loop"
```

## 5. 切换模型或远程接口

本地默认值：

```bash
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
```

切换模型：

```bash
OLLAMA_MODEL=qwen2.5-coder:7b npm run ask -- "解释一下这个 agent 示例"
```

后续如果测试环境 Docker 跑了 Ollama，并暴露端口，可以这样切换：

```bash
OLLAMA_HOST=http://127.0.0.1:<port> OLLAMA_MODEL=qwen2.5:7b npm run ask -- "计算 17*23"
```

测试环境建议：

- 模型目录挂到 `/data9`，不要用根分区。
- 测试机没有 NVIDIA GPU 时，CPU-only 推理会慢。
- 暴露远程端口前要加访问控制，不要把模型 API 开到公网。

## 6. 项目结构

```text
.
├── data/notes.md
├── docs/ARCHITECTURE.md
├── package.json
├── prompts/system.md
├── src/
│   ├── agent.js
│   ├── check.js
│   ├── cli.js
│   ├── ollama-client.js
│   ├── protocol.js
│   └── tools.js
└── test/protocol.test.js
```

## 7. 本地测试

```bash
# 用途：测试协议解析、工具调用和 agent loop 边界
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent/day01-single-agent-cli
# 参数含义：无
# 输出判断：看到“tests passed”
# 风险：不调用 Ollama，不读取真实模型
npm test
```

## 8. 学习重点

先看 `docs/ARCHITECTURE.md`，再按下面顺序读源码：

1. `src/cli.js`
2. `src/agent.js`
3. `src/protocol.js`
4. `src/tools.js`
5. `src/ollama-client.js`

## 9. 从根目录运行

仓库根目录也保留了快捷命令，方便以后按天管理：

```bash
cd /Users/hongsen.ren/code/github-code/llm-agent
npm run ask -- "计算 (18+24)*3"
npm run test
```
