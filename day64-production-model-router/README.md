# Day 64 - Production Model Router

## 概念

这一日补齐生产模型 Provider Router：OpenAI、Claude、Qwen、Ollama 统一接口，支持 streaming、tool calling、JSON schema、retry、timeout、rate limit、token/cost 统计和 fallback。

## 代码结构

- `src/index.js`：provider config、mock provider、router、schema 校验和统计。
- `src/cli.js`：运行 fallback、JSON、stream、tool call demo。
- `test/run.test.js`：覆盖主要生产边界。

## 运行

```bash
# 用途：运行 day64 模型路由 demo
# 执行目录：项目根目录
# 结果判断：completion.provider=ollama，structured.validation.ok=true
# 风险：默认 mock provider，不读取真实密钥内容
npm run day64:start
```

## 环境变量

- `OPENAI_API_KEY` / `OPENAI_MODEL`
- `ANTHROPIC_API_KEY` / `CLAUDE_MODEL`
- `DASHSCOPE_API_KEY` / `QWEN_MODEL`
- `OLLAMA_HOST` / `OLLAMA_MODEL`

## 复盘

- provider 失败、超时、限流和 fallback 应由 router 处理，不应写在 prompt 里。
- JSON schema 输出要做确定性校验，不能只相信模型说“这是 JSON”。
- token/cost 统计要靠请求结果和路由器记录，便于灰度和预算控制。
