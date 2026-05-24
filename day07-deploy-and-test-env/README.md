# Day 07：部署与测试环境

第七天学习如何把本地 agent 切换到测试环境模型接口，并理解远程部署边界。

## 概念

- 本地/测试环境切换只靠 `OLLAMA_HOST`，不改源码。
- Docker 部署命令先 dry-run，真实执行前必须 review 风险。
- 模型目录建议放 `/data9`，不要占用根分区。

## 运行

```bash
# 用途：查看当前 Ollama 配置来源
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent
# 输出判断：显示 host、model、source
# 风险：只读
npm run day07:config
```

```bash
# 用途：检查 OLLAMA_HOST 是否可访问
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent
# 输出判断：ok=true 时可访问；不可访问时返回错误
# 风险：只访问 /api/tags，不生成模型回答
npm run day07:health
```

```bash
# 用途：生成 Docker 部署命令，不执行
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent
# 参数含义：--port 是宿主机端口，--model-dir 是模型目录
# 输出判断：打印 docker run 命令
# 风险：dry-run 只打印命令，不部署
npm run day07:dry-run -- --port 11434 --model-dir /data9/ollama
```

```bash
# 用途：测试配置切换、dry-run 和源码不硬编码测试机地址
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent
# 输出判断：看到 day07 tests passed
# 风险：只跑本地测试
npm run day07:test
```

## 代码入口

- `src/config.js`：配置解析、健康检查、Docker dry-run 命令生成。
- `src/cli.js`：配置、健康检查、dry-run CLI。
- `docs/test-env-ollama.md`：测试环境部署说明。

## 复盘

远程部署属于风险操作。学习阶段先把配置切换和命令生成讲清楚，不自动执行远程 Docker 或拉模型。
