# LLM-Agent 学习项目

这个仓库按“第几天”组织学习内容，方便后续逐步扩展，不把所有 agent 例子堆在一个单体目录里。

## 目录结构

```text
.
├── day01-single-agent-cli/      # 第一天：单体 agent loop + 工具调用
├── day02-multi-agent-preview/   # 第二天：多 agent 协作预告和设计入口
├── package.json                 # 根目录快捷命令，默认指向 day01
└── .gitignore
```

## 第一天：单体 Agent CLI

入口：[day01-single-agent-cli/README.md](/Users/hongsen.ren/code/github-code/llm-agent/day01-single-agent-cli/README.md)

学习重点：

- 本地 Ollama 调用。
- agent loop。
- 工具调用和 observation 回填。
- 本地接口与测试环境 `OLLAMA_HOST` 切换。

根目录可直接运行 day01：

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

## 第二天：多 Agent 协作

入口：[day02-multi-agent-preview/README.md](/Users/hongsen.ren/code/github-code/llm-agent/day02-multi-agent-preview/README.md)

当前第二天先放目标和设计方向，不写未实现命令。等第一天跑通之后，再实现多 agent 版本，例如：

- planner agent：拆任务。
- tool agent：执行工具。
- critic agent：检查结果。
- writer agent：组织最终回答。

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
