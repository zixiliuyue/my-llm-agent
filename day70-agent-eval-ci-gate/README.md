# Day 70 - Agent Eval CI Gate

## 概念

这一日把 Agent 评估接入 CI：PR 时运行 `npm test`、`day58:gate` 和 `day70:ci`，比较 baseline/current 指标，并输出 Markdown 评估报告。

## 代码结构

- `src/index.js`：指标比较、阈值、Markdown 报告、GitHub Actions workflow 草案。
- `src/cli.js`：支持 demo 和 `--ci` gate 模式。
- `test/run.test.js`：覆盖 pass/fail gate 和 workflow。

## 运行

```bash
# 用途：运行 day70 CI gate demo
# 执行目录：项目根目录
# 结果判断：ok=true，markdown 包含 Agent Eval CI Report
# 风险：只比较内置 mock 指标，不访问 GitHub API
npm run day70:start
```

```bash
# 用途：模拟 CI gate
# 执行目录：项目根目录
# 结果判断：通过时退出码 0；失败时退出码 1
# 风险：只运行本地评估逻辑
npm run day70:ci
```

## 复盘

- CI gate 应阻止明显质量回退，而不是只看单元测试。
- 报告要能给 PR reviewer 看懂：指标、差值、阈值和 pass/fail。
- baseline/current 应来自可回放评估集，而不是临场模型自由输出。
