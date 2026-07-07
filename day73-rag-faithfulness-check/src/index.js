/**
 * Day 73：RAG 幻觉检测(faithfulness / groundedness)。
 *
 * 学习目标：day59 的 RAG 已经能返回 citation,但“带了引用”不等于“答案忠于证据”。
 * 模型完全可能引用了文档 A,却写出文档里没有的结论(幻觉)。
 * 这一日在生成之后加一道确定性校验:把答案拆成句子,逐句判断是否有检索证据支撑,
 * 标记出“无依据句”,算出 faithfulness 分数,并给出是否需要拒答或补检索的建议。
 *
 * 边界:句子是否被证据支撑,真实系统可用 NLI 模型或 LLM entailment 判断;
 * 这里用确定性的 token 重合度模拟,但“拆句 / 聚合 / 拒答阈值”始终是代码逻辑。
 */

/** 把一段答案粗切成句子,中英文标点都作为分隔符。 */
// 普通函数：把一段可复用逻辑命名,降低主流程阅读成本。
export function splitSentences(text) {
  // 返回结果：按句末标点切分,去掉空白句。
  return String(text || "")
    .split(/(?<=[。！？.!?])\s*|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * 把句子归一化成“字符级 bigram 集合”,便于比对重合度。
 * 为什么用 bigram 而不是按空格分词:中文没有空格,按空格切会把整句当成一个 token,
 * 重合度永远算不准。字符级 bigram(相邻两字)对中英文都稳健,是教学里最省事的近似。
 * 真实系统应换成分词器 + 向量相似度或 NLI 模型。
 */
// 普通函数：把一段可复用逻辑命名,降低主流程阅读成本。
function toTokens(sentence) {
  // 定义常量：先去掉标点和空白,只保留连续实义字符。
  const cleaned = String(sentence)
    .toLowerCase()
    .replace(/[，。！？、,.!?;:"'（）()\s]/g, "");
  // 条件判断：长度不足 2 的内容无法组成 bigram,直接返回单字符,避免空集合。
  if (cleaned.length < 2) {
    // 返回结果：极短内容退化为单字符集合。
    return cleaned.length === 1 ? [cleaned] : [];
  }
  // 定义常量：滑动窗口生成相邻两字的 bigram。
  const grams = [];
  // 循环：逐字符取长度为 2 的窗口。
  for (let i = 0; i < cleaned.length - 1; i += 1) {
    grams.push(cleaned.slice(i, i + 2));
  }
  // 返回结果：bigram 数组,供上层计算重合比例。
  return grams;
}

/**
 * 判断单个句子是否被证据集合支撑。
 * 模拟 NLI entailment:计算句子关键词在“任一证据片段”中的最大重合比例,
 * 超过阈值视为 supported,否则视为幻觉候选。
 */
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function checkSentenceSupport({ sentence, evidences, threshold = 0.5 }) {
  // 定义常量：待校验句子的关键词集合。
  const tokens = toTokens(sentence);
  // 条件判断：没有实义词的句子(如纯语气句)不计入幻觉,判为 neutral。
  if (tokens.length === 0) {
    // 返回结果：中性句不影响 faithfulness 分数。
    return { sentence, verdict: "neutral", bestScore: 0, source: null };
  }

  // 定义变量：记录与所有证据比对后的最高重合度和来源。
  let bestScore = 0;
  let bestSource = null;
  // 循环：逐个证据片段计算重合度,取最高。
  for (const ev of evidences) {
    // 定义常量：证据片段的关键词集合。
    const evTokens = new Set(toTokens(ev.text));
    // 定义常量：句子关键词落在证据里的数量。
    const overlap = tokens.filter((t) => evTokens.has(t)).length;
    // 定义常量：重合比例 = 命中数 / 句子关键词数。
    const score = overlap / tokens.length;
    // 条件判断：刷新最高分和对应证据来源。
    if (score > bestScore) {
      bestScore = score;
      bestSource = ev.id;
    }
  }

  // 返回结果：重合度达阈值判 supported,否则判 hallucination(需要人工/拒答)。
  return {
    sentence,
    verdict: bestScore >= threshold ? "supported" : "hallucination",
    bestScore: Number(bestScore.toFixed(3)),
    source: bestScore >= threshold ? bestSource : null,
  };
}

/**
 * 对整条答案做 faithfulness 评估。
 * 拆句 -> 逐句判定 -> 聚合成分数和拒答建议。
 */
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function evaluateFaithfulness({ answer, evidences, threshold = 0.5, minFaithfulness = 0.8 }) {
  // 定义常量：把答案拆成句子。
  const sentences = splitSentences(answer);
  // 定义常量：逐句判断是否有证据支撑。
  const checked = sentences.map((sentence) => checkSentenceSupport({ sentence, evidences, threshold }));

  // 定义常量：参与打分的句子(排除 neutral 语气句)。
  const scorable = checked.filter((c) => c.verdict !== "neutral");
  // 定义常量：被证据支撑的句子数量。
  const supported = scorable.filter((c) => c.verdict === "supported").length;
  // 定义常量：无依据句(幻觉候选)清单,供人工核对或触发补检索。
  const hallucinations = checked.filter((c) => c.verdict === "hallucination");

  // 定义常量：faithfulness 分数 = 支撑句 / 可打分句;没有可打分句时视为满分。
  const faithfulness = scorable.length === 0 ? 1 : Number((supported / scorable.length).toFixed(3));

  // 定义常量：低于阈值就建议拒答或补检索,而不是把幻觉答案直接给用户。
  const action = faithfulness >= minFaithfulness ? "accept" : hallucinations.length === scorable.length ? "refuse" : "revise";

  // 返回结果：完整的 faithfulness 报告。
  return {
    faithfulness,
    supportedCount: supported,
    scorableCount: scorable.length,
    hallucinations: hallucinations.map((h) => ({ sentence: h.sentence, bestScore: h.bestScore })),
    action,
    sentences: checked,
  };
}

/** CLI demo：分别评估一条“忠于证据”和一条“夹带幻觉”的答案。 */
// 普通函数：把一段可复用逻辑命名,降低主流程阅读成本。
export function runDemo() {
  // 定义常量：模拟 day59 RAG 检索回来的证据片段。
  const evidences = [
    { id: "doc:runbook#1", text: "p95 延迟升高的根因是数据库慢查询,缺失 orders 表的复合索引。" },
    { id: "doc:runbook#2", text: "临时缓解措施是限流,长期修复是补索引并优化 SQL。" },
  ];

  // 定义常量：忠于证据的答案——每句都能在证据里找到支撑。
  const faithfulAnswer = "p95 延迟升高的根因是数据库慢查询。长期修复是补索引并优化 SQL。";
  // 定义常量：夹带幻觉的答案——第二句“机房断电”证据里根本没有。
  const hallucinatedAnswer = "p95 延迟由数据库慢查询导致。此外机房断电也是原因之一,建议更换服务器供应商。";

  // 定义常量：分别评估两条答案。
  const faithful = evaluateFaithfulness({ answer: faithfulAnswer, evidences });
  const hallucinated = evaluateFaithfulness({ answer: hallucinatedAnswer, evidences });

  // 返回结果：调用方拿到两条对照报告。
  return {
    day: 73,
    title: "rag-faithfulness-check",
    localOnly: true,
    evidences,
    faithful,
    hallucinated,
    notes: [
      "带 citation 不等于忠于证据,必须逐句校验",
      "无依据句要标记出来,而不是混在答案里给用户",
      "faithfulness 低于阈值时应拒答或补检索,不能盲目输出",
    ],
  };
}
