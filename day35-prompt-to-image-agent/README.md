# Day 35：Prompt 到图片 Agent

## 概念

文本模型不生成图片，也不决定调用云服务。Day35 让 Ollama 只做 prompt 优化，输出结构化 `positivePrompt`、`negativePrompt` 和本地 `comfy:image` handoff。

## 代码结构

- `src/index.js`：确定性 prompt 优化、Ollama 请求结构和响应解析。
- `src/cli.js`：从命令行接收一句需求并输出图片 handoff。
- `test/run.test.js`：验证 role boundary、JSON 请求和 fallback。

## 运行

```bash
# 用途：把一句图片需求改写成本地 ComfyUI prompt
# 执行目录：<项目根目录>/day35-prompt-to-image-agent
# 结果判断：输出 optimized.handoff.provider 为 comfy:image
# 风险：默认不访问 Ollama，只生成请求结构
npm run demo -- "一个 Windows 5060 Ti 工作站正在跑本地图片模型"
```

PowerShell：

```powershell
# 用途：指定文本模型名称后生成同样的 prompt 请求结构
# 执行目录：<项目根目录>\day35-prompt-to-image-agent
# 结果判断：ollamaRequest.model 为 qwen2.5-coder:14b
# 风险：不拉模型、不调用真实 Ollama
$env:OLLAMA_MODEL="qwen2.5-coder:14b"; npm run demo -- "本地 agent 平台封面图"
```

## 实验

如果 Windows 机器已经启动 Ollama，可以把 `buildOllamaPromptRequest` 的结果发给本机 `/api/chat`，再把解析结果交给 day33 的 ComfyUI adapter。

## 复盘

这一步的核心是角色分离：LLM 负责语言整理，图片模型负责生成，路由和本地安全边界由代码负责。
