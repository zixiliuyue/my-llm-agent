# Day 06：评测与可观测性

第六天学习如何判断 agent 是否真的变好了，而不是只凭一次聊天感觉。

## 概念

- eval case：问题、期望工具、期望文本。
- trace：一次 agent run 的事件序列。
- latency：每条 case 的执行耗时。
- regression：新增功能不能破坏旧例子。

## 运行

```bash
# 用途：运行 mock eval 并输出 JSON 报告
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent
# 输出判断：summary.failed 为 0
# 风险：默认 mock runner，不调用 Ollama
npm run day06:eval
```

```bash
# 用途：测试 eval case、trace 和统计字段
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent
# 输出判断：看到 day06 tests passed
# 风险：只跑本地测试
npm run day06:test
```

## 代码入口

- `evals/cases.jsonl`：评测用例。
- `src/eval-runner.js`：加载 case、运行 mock agent、统计 trace。
- `src/cli.js`：输出评测报告。

## 复盘

评测不要只看最终文本，还要检查是否调用了正确工具，以及失败时能定位到具体 case。
