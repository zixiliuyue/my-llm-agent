# mini-openclaw 30 天学习项目

这个仓库从 LLM-Agent 基础逐步演化到教学版 mini-openclaw。每一天都是完全自包含的小项目：有自己的 `package.json`、`README.md`、`src/` 和 `test/`，源码不 import 其它 day，方便学习过程中随意修改某一天代码。

## 30 天路线

| Day | 目录 | 主题 | 入口 |
|---|---|---|---|
| 1 | `day01-single-agent-cli` | 单体 agent loop + 工具调用 | `npm run day01:start` / `npm run day01:test` |
| 2 | `day02-multi-agent-cli` | planner/tool-runner/critic/writer 多 agent 协作 | `npm run day02:start` / `npm run day02:test` |
| 3 | `day03-memory-and-rag` | 本地 memory、chunk、检索、引用 | `npm run day03:start` / `npm run day03:test` |
| 4 | `day04-tools-and-mcp` | 工具注册、权限边界、MCP mock | `npm run day04:start` / `npm run day04:test` |
| 5 | `day05-vue-web-agent` | Vue3 + Vite Web UI + Node agent API | `npm run day05:start` / `npm run day05:test` |
| 6 | `day06-evaluation-observability` | eval cases、trace、耗时和调用统计 | `npm run day06:start` / `npm run day06:test` |
| 7 | `day07-deploy-and-test-env` | 本地/测试环境切换和部署 dry-run | `npm run day07:start` / `npm run day07:test` |
| 8 | `day08-http-gateway` | 最小 HTTP Gateway | `npm run day08:start` / `npm run day08:test` |
| 9 | `day09-websocket-gateway` | WebSocket Gateway 事件流 | `npm run day09:start` / `npm run day09:test` |
| 10 | `day10-jsonl-session-store` | JSONL session store | `npm run day10:start` / `npm run day10:test` |
| 11 | `day11-workspace-bootstrap` | workspace bootstrap | `npm run day11:start` / `npm run day11:test` |
| 12 | `day12-model-provider-router` | model provider router | `npm run day12:start` / `npm run day12:test` |
| 13 | `day13-tool-policy` | tool policy 和审批边界 | `npm run day13:start` / `npm run day13:test` |
| 14 | `day14-event-stream-ui` | 事件流 UI | `npm run day14:start` / `npm run day14:test` |
| 15 | `day15-webchat-session` | WebChat session | `npm run day15:start` / `npm run day15:test` |
| 16 | `day16-skills-loader` | skills loader | `npm run day16:start` / `npm run day16:test` |
| 17 | `day17-plugin-manifest` | plugin manifest | `npm run day17:start` / `npm run day17:test` |
| 18 | `day18-mcp-adapter-mock` | MCP adapter mock | `npm run day18:start` / `npm run day18:test` |
| 19 | `day19-file-memory-store` | file memory store | `npm run day19:start` / `npm run day19:test` |
| 20 | `day20-background-jobs` | background jobs | `npm run day20:start` / `npm run day20:test` |
| 21 | `day21-webhook-channel-adapter` | webhook channel adapter | `npm run day21:start` / `npm run day21:test` |
| 22 | `day22-mock-chat-channel` | mock chat channel | `npm run day22:start` / `npm run day22:test` |
| 23 | `day23-device-node-pairing` | device node pairing | `npm run day23:start` / `npm run day23:test` |
| 24 | `day24-sandbox-policy-dry-run` | sandbox policy dry-run | `npm run day24:start` / `npm run day24:test` |
| 25 | `day25-command-queue-steering` | command queue + steering | `npm run day25:start` / `npm run day25:test` |
| 26 | `day26-doctor-config-checker` | doctor/config checker | `npm run day26:start` / `npm run day26:test` |
| 27 | `day27-gateway-auth` | gateway auth | `npm run day27:start` / `npm run day27:test` |
| 28 | `day28-observability-dashboard` | observability dashboard | `npm run day28:start` / `npm run day28:test` |
| 29 | `day29-onboarding-cli` | onboarding CLI | `npm run day29:start` / `npm run day29:test` |
| 30 | `day30-mini-openclaw-integrated` | mini-openclaw integrated | `npm run day30:start` / `npm run day30:test` |

## 快速验证

```bash
# 用途：运行 day01-day30 的 mock/unit 测试
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent
# 输出判断：每个 day 打印 tests passed，最终退出码为 0
# 风险：不调用真实模型、不部署、不执行远程命令
npm test
```

## 学习规则

- 每天只学习一个 mini-openclaw 能力点。
- 每个 day 都可以单独进入目录运行 `npm start` 和 `npm test`。
- 概念可以递进，代码不跨 day 引用。
- 所有真实模型、远程部署、shell 执行默认 mock 或 dry-run。
- Web day 只做教学用最小页面，重点展示事件和状态，不做复杂产品 UI。

## 本地模型默认值

```bash
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
```

默认测试不依赖 Ollama。只有显式运行真实模型示例时，才会访问 `OLLAMA_HOST`。
