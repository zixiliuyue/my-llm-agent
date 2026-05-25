# Day 58：Agent Harness Eval Replay

## 概念

岗位截图明确要求 Agent 可测试、可评估、可回放、可比较。Day58 把一次 run 固化成 snapshot，用 golden dataset 做回归，输出 tool-call accuracy、groundedness、latency、cost、recovery 等指标。

## 代码结构

- `src/index.js`：replay、compare、score、suite eval 和 CI gate。
- `src/cli.js`：输出 harness demo；`--gate` 模式可作为 CI 门禁。
- `test/run.test.js`：覆盖回放、对比、通过和失败门禁。

## 运行

```bash
# 用途：查看 Agent Harness demo
# 执行目录：<项目根目录>/day58-agent-harness-eval-replay
# 结果判断：输出 replay、compare、gate，gate.ok 为 true
# 风险：只跑本地 snapshot，不访问模型服务
npm run demo
```

```bash
# 用途：模拟 CI eval gate
# 执行目录：<项目根目录>/day58-agent-harness-eval-replay
# 结果判断：全部 golden case 通过时退出码为 0
# 风险：只读本地数据
npm run gate
```

## 实验

把 `requiredCitations` 改成不存在的引用，观察 groundedness 如何失败；把 candidate latency 改大，观察 compare 如何识别 regression。

## 复盘

没有 harness 的 Agent 只能算 demo。有 replay、compare 和 CI gate，才有资格持续改 prompt、工具和模型。
