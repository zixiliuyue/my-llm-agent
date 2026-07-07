# three-year-goals

## 概念

这是一个自包含学习项目，不依赖仓库里其它 day 的源码。项目把你的当前技能画像、未来三年的技术趋势、以及你最常遇到的真实工程场景组合成一个“学习路线规划器”。

它不是泛泛输出“去学 AI / 去学云原生”，而是围绕你的工作重心做规划：

- Go 后端与消费链路排障
- CLI 与内部工具产品化
- 配置中心 / 测试环境 / 发布验证
- 前端定点修补
- 未来三年的 AI 工程、平台工程、可观测、安全治理

## 代码结构

```text
three-year-goals/
├── package.json
├── README.md
├── src/
│   ├── cli.js
│   ├── data.js
│   ├── index.js
│   ├── planner.js
│   └── render.js
└── test/
    └── run.test.js
```

文件职责：

- `src/data.js`：定义你的默认技能画像、未来趋势、真实练手场景。
- `src/planner.js`：计算优势、短板、优先级，并生成三年路线图。
- `src/render.js`：把规划结果渲染成可读文本。
- `src/cli.js`：命令行入口，直接输出学习项目建议。
- `test/run.test.js`：验证排序、季度规划、真实场景映射与渲染结果。

## 运行

```bash
# 用途：查看三年学习路线和场景项目建议
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent/three-year-goals
# 结果判断：终端输出“未来三年学习项目”
# 风险：只读运行，不访问外部服务
source /Users/hongsen.ren/.nvm/nvm.sh && nvm use 18 >/dev/null && npm start
```

```bash
# 用途：运行单元测试
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent/three-year-goals
# 结果判断：输出“three-year-goals tests passed”
# 风险：只跑本地 Node 测试，不访问外部服务
source /Users/hongsen.ren/.nvm/nvm.sh && nvm use 18 >/dev/null && npm test
```

## 实验

建议按下面顺序做实验，而不是一次性全学：

1. 先运行 CLI，确认路线图是否符合你现在的工作重心。
2. 调整 `src/data.js` 里的技能分值，观察优先级是否变化。
3. 把真实工作中的新场景继续追加到 `PRACTICE_SCENARIOS`。
4. 把路线图里的季度项目拆成独立仓库或独立子目录去实现。

## 实际场景

项目内置了三类与你当前技能最贴近的练手场景：

- `configcenter-consumer-lab`：消费链路对脏数据做解析容错与证据输出。
- `release-guard-cli-lab`：把发布前检查、审批、回滚路径收敛成 CLI。
- `agent-ops-evidence-board`：把观测、权限、审批、SQL、复盘串成 AI 工程闭环。

这些场景不是玩具题，而是直接对应你当前的工作模式和未来三年的高价值方向。

## 复盘

这个项目的价值不在“把路线图打印出来”，而在于它明确了一个判断标准：

- 哪些是你已经具备的可迁移优势
- 哪些是未来三年必须补齐的基础设施能力
- 哪些练习题最接近你真实会做、也最值得沉淀成作品集的场景

如果后续你要继续扩展，正确方向是补更多真实工程场景、更多验收条件、更多练手项目，不是堆更多抽象名词。
