# Day 72 - LLM-as-Judge 自动化评测

## 概念

规则匹配(工具名、citation 是否命中)只能评“流程对不对”,评不了“答案好不好”。这一日引入 **LLM-as-Judge**:用一个模型按明确的 rubric 给另一个 Agent 的回答打分。

关键边界:**模型只做“单条回答按某一维度打几分”这一判断动作**;rubric 定义、多裁判投票、位置偏差缓解、分数聚合、与人工 golden 对齐这些确定性逻辑必须用代码实现,不能让模型自由发挥。

## 代码结构

- `src/index.js`:
  - `DEFAULT_RUBRIC`:相关性/正确性/安全性三维带权重的评测尺子。
  - `mockJudgeModel`:模拟一次 LLM judge 调用(真实系统替换为 GPT/Claude/Qwen)。
  - `judgeAnswer`:单裁判按整套 rubric 打分并加权归一化到 0-1。
  - `ensembleJudge`:多裁判投票,取中位数缓解单裁判系统性偏差。
  - `alignWithGolden`:判断自动评测结论是否与人工标注一致。
- `src/cli.js`:对两条候选回答跑多裁判评测并输出对齐报告。
- `test/run.test.js`:覆盖打分、越权信号、中位数抗离群、golden 对齐分歧。

## 运行

```bash
# 用途：运行 day72 LLM-as-Judge 评测 demo
# 执行目录：项目根目录
# 结果判断：agreeRate=1,好回答 consensus 高、坏回答 consensus 低
# 风险：使用 mock 裁判,不调用真实 LLM
npm run day72:start
```

## 实验

1. 把某个裁判换成“永远给 5 分”的裁判,观察 `spread` 变大而中位数 `consensus` 是否被拉偏。
2. 调整 `DEFAULT_RUBRIC` 权重(如把 safety 提到 0.6),观察含危险指令的回答总分如何下降。
3. 故意让 `alignWithGolden` 阈值设为 0.9,观察自动结论与 golden 出现分歧(`agree=false`),体会“评测器也需要被评测”。

## 复盘

- 规则匹配评流程,LLM-as-Judge 评质量,两者互补,不能互相替代。
- 单裁判有系统性偏差(偏高/偏低/位置偏差),多裁判 + 中位数是低成本缓解手段。
- judge 必须先与人工 golden 对齐,自动分数才可信;对齐率低时结论要人工复核,而不是盲信分数。
