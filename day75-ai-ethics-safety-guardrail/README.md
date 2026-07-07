# Day 75 - AI 伦理与内容安全护栏

## 概念

day61 的安全沙盒偏“技术攻击面”(prompt injection、secret、PII)。这一日补的是 **AI 伦理落地的内容治理面**:在模型两侧各加一道确定性护栏。

- **输入护栏(input guard)**:对用户请求做意图分类,识别违法危险物/自伤/仇恨等高风险类别,命中即拒答——连模型都不调用,省成本又防越权。
- **输出护栏(output guard)**:对模型回答做 toxicity(有害言论)和 bias(刻板印象)检测。toxicity 直接拦截,bias 优先**改写**为中性表述而非一律拒答。
- **审计**:放行 / 改写 / 拦截都留可复盘记录,理由脱敏,不回显原始危险内容。

关键边界:模型可以做“语义分类”判断,但“命中后拒答还是改写、如何脱敏、是否留审计”是确定性代码,不能让模型自己决定放不放行。真实系统会把规则替换成专门的 moderation 模型(OpenAI moderation、Llama Guard),但护栏结构不变。

## 代码结构

- `src/index.js`:
  - `inputGuard`:用户请求风险意图分类,命中即 block + 安全回复。
  - `outputGuard`:输出侧 toxicity(block)/ bias(revise)检测。
  - `runGuardedPipeline`:输入护栏 →(放行才)调用模型 → 输出护栏 → 审计的端到端管道。
- `src/cli.js`:跑正常 / 输入违规 / 输出带偏见三种典型场景。
- `test/run.test.js`:覆盖输入拦截、输出拦截、偏见改写、审计记录和管道分支。

## 运行

```bash
# 用途：运行 day75 AI 伦理与内容安全护栏 demo
# 执行目录：项目根目录
# 结果判断：normal 全程放行,blockedInput 在 input 侧拦截,revisedOutput 被改写,audit 非空
# 风险：使用关键词词典模拟 moderation,不调用真实 moderation 模型
npm run day75:start
```

## 实验

1. 给 `INPUT_RISK_CATEGORIES` 增加一个新类别(如诈骗话术),观察输入护栏如何扩展。
2. 把 bias 命中的处理从 `revise` 改成 `block`,对比“改写 vs 拒答”对用户体验的差别。
3. 构造一条同时命中 toxicity 和 bias 的输出,观察护栏的优先级(有害言论优先拦截)。

## 复盘

- AI 伦理不是模型自觉,而是模型两侧的确定性护栏:输入拦意图,输出拦表达。
- toxicity 直接拦截,bias 优先改写——因为偏见常是“表述不当”而非“意图恶意”,改写比拒答更有用。
- 拦截和改写都必须留审计、理由脱敏,不回显原始危险内容,这是合规审查和事后复盘的依据。
- 关键词词典只是教学近似,真实系统必须用 moderation 模型,并持续更新类别与语料。
