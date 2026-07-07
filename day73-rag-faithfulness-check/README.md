# Day 73 - RAG 幻觉检测 (faithfulness / groundedness)

## 概念

day59 的 RAG 已经能返回 citation,但**“带了引用”不等于“答案忠于证据”**。模型可能引用了文档 A,却写出文档里根本没有的结论——这是生成式 AI 落地最危险的失败模式之一。

这一日在生成之后加一道确定性校验:把答案拆成句子,逐句判断是否有检索证据支撑,标记出“无依据句”,算出 faithfulness 分数,并决定是 **accept / revise / refuse**。

## 代码结构

- `src/index.js`:
  - `splitSentences`:中英文标点拆句。
  - `checkSentenceSupport`:模拟 NLI entailment,用 token 重合度判断单句是否被证据支撑。
  - `evaluateFaithfulness`:拆句 → 逐句判定 → 聚合出 faithfulness 分数和拒答建议。
- `src/cli.js`:对照评估“忠于证据”和“夹带幻觉”两条答案。
- `test/run.test.js`:覆盖拆句、支撑判定、幻觉标记和 action 决策。

## 运行

```bash
# 用途：运行 day73 RAG 幻觉检测 demo
# 执行目录：项目根目录
# 结果判断：faithful.action=accept,hallucinated 标出无依据句且 action 非 accept
# 风险：使用 token 重合度模拟,不调用真实 NLI/LLM 模型
npm run day73:start
```

## 实验

1. 把 `checkSentenceSupport` 的 `threshold` 调到 0.8,观察更多句子被判为幻觉(召回变严)。
2. 给 `evidences` 补一条覆盖“机房断电”的证据,观察原本的幻觉句变成 supported。
3. 把 `minFaithfulness` 调到 1.0,观察只要有一句无依据就触发 revise/refuse,体会严格风控的代价。

## 复盘

- citation 只证明“看了哪篇文档”,faithfulness 才证明“答案是否忠于文档”,两者必须都有。
- 无依据句要显式标记出来交给人工或触发补检索,而不是混在答案里给用户。
- 幻觉是概率问题不可能归零,工程手段是“检测 + 拒答/改写”,而不是假设模型不会编造。
