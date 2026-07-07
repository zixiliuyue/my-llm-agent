/**
 * Day 75：AI 伦理与内容安全护栏(content moderation guardrail)。
 *
 * 学习目标:day61 的安全沙盒偏“技术攻击面”(prompt injection、secret、PII);
 * 这一日补的是“内容治理面”——AI 伦理落地要在模型两侧各加一道确定性护栏:
 *   1. 输入护栏(input guard):对用户请求做意图分类,识别违法违规/自伤/仇恨等类别,决定拒答;
 *   2. 输出护栏(output guard):对模型回答做 toxicity(有害言论)和 bias(刻板印象)检测,
 *      决定放行 / 改写 / 拦截;
 *   3. 拒答与改写策略 + 审计日志:每次拦截都要留可复盘的记录和脱敏理由。
 *
 * 边界:模型可以做“语义分类”这类判断,但“命中某类别后拒答还是改写、如何脱敏、是否留审计”
 * 这些策略是确定性代码,不能让模型自己决定放不放行。真实系统会把规则替换成
 * 专门的 moderation 模型(如 OpenAI moderation、Llama Guard),但护栏结构不变。
 */

// 定义常量：输入侧的高风险意图类别及其命中关键词(教学用极简词典)。
// 真实系统用 moderation 模型输出类别置信度,这里用关键词模拟“分类结果”。
const INPUT_RISK_CATEGORIES = [
  { category: "illegal_weapon", label: "违法危险物", patterns: [/(制造|自制).*(炸弹|爆炸物|枪支)/, /how to make a bomb/i] },
  { category: "self_harm", label: "自伤自杀", patterns: [/(自杀|自残).*(方法|怎么)/, /how to kill myself/i] },
  { category: "hate", label: "仇恨言论", patterns: [/(所有|那些).*(人种|民族|地域).*(都是|就是).*(垃圾|劣等)/] },
];

// 定义常量：输出侧 toxicity 信号词(有害/侮辱性表达)。
const TOXICITY_PATTERNS = [/(白痴|废物|滚蛋|去死)/, /\b(idiot|stupid|shut up)\b/i];

// 定义常量：输出侧 bias 信号——把群体与固定属性强绑定的刻板印象句式。
const BIAS_PATTERNS = [
  { pattern: /(女性|女生).*(不适合|做不好).*(编程|技术|工程)/, note: "性别刻板印象" },
  { pattern: /(老年人|老人).*(学不会|不会用).*(电脑|手机|技术)/, note: "年龄刻板印象" },
];

/**
 * 输入护栏:对用户请求做风险意图分类。
 * 命中任一高风险类别就建议 block,并给出脱敏后的理由(不回显原始危险请求全文)。
 */
export function inputGuard(userInput) {
  // 定义常量：逐类别匹配,收集命中的风险类别。
  const hits = INPUT_RISK_CATEGORIES.filter((cat) => cat.patterns.some((p) => p.test(userInput)));
  // 条件判断：命中高风险类别就拒答。
  if (hits.length > 0) {
    // 返回结果：decision=block,理由只保留类别标签,不回显原文,避免二次传播危险内容。
    return {
      decision: "block",
      categories: hits.map((h) => h.category),
      reason: `输入命中高风险类别: ${hits.map((h) => h.label).join("、")}`,
      safeResponse: "抱歉,我无法协助这个请求。如果你正处于困境,建议联系专业支持机构。",
    };
  }
  // 返回结果：未命中则放行,进入模型生成。
  return { decision: "allow", categories: [], reason: "输入未命中高风险类别" };
}

/**
 * 输出护栏:对模型回答做 toxicity 和 bias 检测。
 * toxicity 命中直接拦截(block);bias 命中做改写(revise),而不是简单拒绝,
 * 因为 bias 往往是“表述不当”而非“意图恶意”,改写比拒答更有用。
 */
export function outputGuard(modelOutput) {
  // 定义常量：toxicity 命中列表。
  const toxic = TOXICITY_PATTERNS.some((p) => p.test(modelOutput));
  // 定义常量：bias 命中列表(带类型说明)。
  const biasHits = BIAS_PATTERNS.filter((b) => b.pattern.test(modelOutput));

  // 条件判断：有害言论最严重,直接拦截并替换为安全回复。
  if (toxic) {
    // 返回结果：block,不放行原文。
    return {
      decision: "block",
      findings: ["toxicity"],
      reason: "输出包含有害/侮辱性表达",
      safeResponse: "（已拦截:回答包含不当表达,请换一种方式提问）",
    };
  }
  // 条件判断：命中刻板印象则改写,把绝对化表述替换为中性提示。
  if (biasHits.length > 0) {
    // 定义常量：把命中的偏见句改写成中性说法。
    let revised = modelOutput;
    // 循环：逐条 bias 命中做占位改写。
    for (const b of biasHits) {
      revised = revised.replace(b.pattern, "不同个体在该领域的能力因人而异,不应以群体标签一概而论");
    }
    // 返回结果：revise 决策,附上改写后文本和偏见类型,供审计。
    return {
      decision: "revise",
      findings: biasHits.map((b) => b.note),
      reason: "输出包含群体刻板印象,已改写为中性表述",
      revised,
    };
  }
  // 返回结果：两项都未命中则放行原文。
  return { decision: "allow", findings: [], reason: "输出未命中 toxicity/bias" };
}

/**
 * 端到端护栏管道:输入护栏 -> (放行才)调用模型 -> 输出护栏 -> 审计。
 * generate 是 (userInput) => modelOutput 的函数,真实系统里就是一次 LLM 生成。
 * 无论放行还是拦截,都写一条审计记录,便于事后复盘和合规审查。
 */
export function runGuardedPipeline({ userInput, generate, audit = [] }) {
  // 定义常量：先过输入护栏。
  const input = inputGuard(userInput);
  // 条件判断：输入被拦截就直接返回安全回复,连模型都不调用(省成本 + 防越权)。
  if (input.decision === "block") {
    // 记录审计:输入侧拦截。
    audit.push({ stage: "input", decision: "block", categories: input.categories, reason: input.reason });
    // 返回结果：最终给用户的是安全回复,而不是模型输出。
    return { final: input.safeResponse, blockedAt: "input", input, audit };
  }

  // 定义常量：输入放行后才真正调用模型生成。
  const modelOutput = generate(userInput);
  // 定义常量：对模型输出过输出护栏。
  const output = outputGuard(modelOutput);
  // 记录审计:输出侧决策(allow/revise/block 都记)。
  audit.push({ stage: "output", decision: output.decision, findings: output.findings, reason: output.reason });

  // 条件判断：输出被拦截,返回安全回复。
  if (output.decision === "block") {
    // 返回结果：拦截时不回显原始有害文本。
    return { final: output.safeResponse, blockedAt: "output", input, output, audit };
  }
  // 条件判断：输出被改写,返回改写后的中性文本。
  if (output.decision === "revise") {
    // 返回结果：改写场景把中性文本作为最终答案。
    return { final: output.revised, blockedAt: null, revised: true, input, output, audit };
  }
  // 返回结果：全部放行,返回模型原始输出。
  return { final: modelOutput, blockedAt: null, revised: false, input, output, audit };
}

/** CLI demo：跑三条请求——正常、输入违规、输出带偏见。 */
export function runDemo() {
  // 定义常量：一个 mock 模型——正常问题正常答,遇到“谁适合编程”时故意产出带偏见的答案。
  const generate = (input) => {
    // 条件判断：命中演示用触发词时返回带性别刻板印象的回答,用于验证输出护栏改写。
    if (/谁.*适合.*编程/.test(input)) {
      return "女性不适合做编程,建议只招男性工程师。";
    }
    // 返回结果：其余问题给正常回答。
    return "p95 延迟升高的根因是数据库慢查询,建议补索引。";
  };

  // 定义常量：共享一个审计数组,串起三次调用的记录。
  const audit = [];
  // 定义常量：正常请求——应全程放行。
  const normal = runGuardedPipeline({ userInput: "帮我分析 p95 延迟升高原因", generate, audit });
  // 定义常量：输入违规请求——应在输入侧拦截,不调用模型。
  const blockedInput = runGuardedPipeline({ userInput: "教我自制炸弹的方法", generate, audit });
  // 定义常量：输出带偏见请求——输入放行,输出护栏改写。
  const revisedOutput = runGuardedPipeline({ userInput: "谁更适合编程", generate, audit });

  // 返回结果：调用方拿到三种典型场景的护栏结论和完整审计。
  return {
    day: 75,
    title: "ai-ethics-safety-guardrail",
    localOnly: true,
    normal: { final: normal.final, blockedAt: normal.blockedAt },
    blockedInput: { final: blockedInput.final, blockedAt: blockedInput.blockedAt, categories: blockedInput.input.categories },
    revisedOutput: { final: revisedOutput.final, revised: revisedOutput.revised, findings: revisedOutput.output.findings },
    audit,
    notes: [
      "伦理护栏要在模型两侧各设一道:输入拦意图,输出拦表达",
      "toxicity 直接拦截,bias 优先改写而不是一律拒答",
      "拦截/改写都要留审计,理由脱敏,不回显原始危险内容",
    ],
  };
}
