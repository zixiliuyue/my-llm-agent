# Troubleshooting Guide

这份文档汇总本仓库常见失败场景。优先先跑 `npm run doctor`，再根据错误归类处理。

## 快速定位

```bash
# 用途：检查 Node、npm、Ollama、ComfyUI、FramePack、Python、模型目录和 Windows GPU
# 执行目录：项目根目录
# 结果判断：OK 表示可继续；WARN/FAIL 按本文件对应章节处理
# 风险：只读检查，不安装软件、不拉模型、不改驱动
npm run doctor
```

## Node / npm 问题

现象：

- `node: command not found`
- `npm: command not found`
- `SyntaxError` 出现在现代 JS 语法上

处理：

```bash
# 用途：确认当前 Node 版本
# 执行目录：项目根目录
# 结果判断：Node >= 18.17；当前项目在 Node 22 上已验证
# 风险：只读
node -v && npm -v
```

如果使用 nvm：

```bash
# 用途：加载 nvm 并切换到本机已安装的 Node
# 执行目录：任意目录
# 结果判断：node -v 可输出版本
# 风险：只影响当前 shell
source /Users/hongsen.ren/.nvm/nvm.sh
nvm use 22
```

## Ollama 未启动

现象：

- `ECONNREFUSED 127.0.0.1:11434`
- `ollama:tags` 失败

处理：

```bash
# 用途：启动 Ollama 本地服务
# 执行目录：任意目录
# 结果判断：另一个终端访问 /api/tags 有响应
# 风险：会启动本机常驻服务，占用端口 11434
ollama serve
```

```bash
# 用途：确认默认模型是否存在
# 执行目录：任意目录
# 结果判断：列表里包含 qwen2.5:7b 或当前 OLLAMA_MODEL
# 风险：只读
ollama list
```

## Ollama 模型未拉取

现象：

- doctor 提示默认模型未安装
- day01/day05/day02 真实模型示例失败

处理：

```bash
# 用途：拉取默认学习模型
# 执行目录：任意目录
# 结果判断：ollama list 能看到 qwen2.5:7b
# 风险：会下载模型，占用磁盘；运行时占用内存/显存
ollama pull qwen2.5:7b
```

Windows 5060 Ti 16G 代码实验可用：

```powershell
# 用途：临时切到代码模型
# 执行目录：项目根目录
# 结果判断：仅当前 PowerShell 会话生效
# 风险：模型运行会占用 GPU 显存
$env:OLLAMA_MODEL="qwen2.5-coder:14b"; npm run day01:ask -- "解释 agent loop"
```

## ComfyUI / FramePack 端口问题

现象：

- `COMFYUI_HOST must be local`
- `FramePack endpoint must be local`
- 端口 `8188` / `7860` 无响应

处理：

```bash
# 用途：确认 ComfyUI 是否监听
# 执行目录：任意目录
# 结果判断：返回 JSON 或 HTTP 响应
# 风险：只读访问本机端口
curl http://127.0.0.1:8188/system_stats
```

```bash
# 用途：确认 FramePack 或视频服务是否监听
# 执行目录：任意目录
# 结果判断：返回服务响应或明确连接失败
# 风险：只读访问本机端口
curl http://127.0.0.1:7860/
```

本仓库默认拒绝远程图片/视频服务地址。需要远程服务时，应先补鉴权、审批、审计和网络 allowlist。

## Docker Compose 不可用

现象：

- `docker: unknown command: docker compose`
- `day57:compose` / `day60:compose` / `day68:compose` 输出 `ok=false`

处理：

```bash
# 用途：确认 Docker Compose 是否可用
# 执行目录：任意目录
# 结果判断：输出 Docker Compose 版本
# 风险：只读
docker compose version
```

如果不可用，安装或更新 Docker Desktop。默认 `npm test` 不依赖 Docker，所以这不是单元测试失败原因。

## GitHub Actions / CI Gate 失败

现象：

- PR 检查中 `npm test` 失败
- `day58:gate` 或 `day70:ci` 失败

处理：

```bash
# 用途：本地复现 CI 评估
# 执行目录：项目根目录
# 结果判断：退出码为 0，输出 gate ok=true
# 风险：只跑本地 mock 评估
npm test
npm run day58:gate
npm run day70:ci
```

如果 `day70:ci` 失败，查看 Markdown 报告里的具体指标：`passRate`、`toolCallAccuracy`、`groundedness`、`avgLatencyMs`、`costUsd`。

## 权限 / MCP / SQL 误用

常见判断：

- `/health` 或 `/sse` 可访问不等于 MCP 可用，必须验证 `/mcp`、initialize、`tools/list`。
- SQL Agent 只生成 SQL 和 rollback SQL，不连接数据库、不执行。
- 远程命令高危操作应直接 blocked，不进入审批。

推荐验证：

```bash
# 用途：验证安全相关案例
# 执行目录：项目根目录
# 结果判断：相关 day 均 tests passed
# 风险：mock/dry-run，不访问真实系统
npm run day43:test && npm run day48:test && npm run day53:test && npm run day54:test && npm run day61:test && npm run day66:test
```

## Windows GPU 不可见

现象：

- `nvidia-smi` 不存在
- doctor 无法识别 NVIDIA GPU
- Ollama 没有使用 GPU

处理：

```powershell
# 用途：确认 Windows 能看到 NVIDIA 驱动和显存
# 执行目录：任意目录
# 结果判断：输出 RTX 5060 Ti 和显存信息
# 风险：只读
nvidia-smi
```

如果命令不存在，先修驱动或 PATH，不要先改项目代码。
