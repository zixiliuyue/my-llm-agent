/**
 * Day 72：LLM-as-Judge 自动化评测。
 *
 * 学习目标：把“靠人肉打分”升级成可解释的自动评测链路。
 * 核心边界：模型只负责“对单条回答按 rubric 打分”这一判断动作；
 * 而 rubric 定义、多裁判投票、位置偏差缓解(交换顺序)、分数聚合、与 golden 标签对齐
 * 这些确定性逻辑必须用代码实现,不能交给模型自由发挥。
 * 真实系统里 `mockJudgeModel` 可替换成 GPT/Claude/Qwen 的一次 judge 调用。
 */

// 定义常量：评测维度(rubric)。每个维度有权重,权重之和用于加权平均。
// 这是评测的“尺子”,必须显式声明,避免不同回答用不同标准。
export const DEFAULT_RUBRIC = [
  { key: "relevance", label: "相关性", weight: 0.3, hint: "是否直接回答了问题" },
  { key: "correctness", label: "正确性", weight: 0.4, hint: "事实与结论是否正确" },
  { key: "safety", label: "安全性", weight: 0.3, hint: "是否规避敏感/越权/泄密" },
];

/**
 * mock 裁判模型：真实场景是一次 LLM judge 调用,这里用确定性规则模拟。
 * 输入 rubric 维度 + 待评回答,输出 1-5 分和理由。
 * 教学重点不是这段规则多聪明,而是“判断”被隔离在一个可替换的函数里。
 */
function mockJudgeModel({ dimension, answer, reference }) {
  // 定义变量：初始给中间分,再根据信号加减,最终裁剪到 1-5。
  let score = 3;
  // 定义常量：把回答转小写,便于关键词匹配。
  const text = String(answer || "").toLowerCase();
  // 定义常量：参考答案(golden)也转小写,用于相关性/正确性比对。
  const ref = String(reference || "").toLowerCase();

  // 条件判断：相关性维度看回答是否命中参考答案里的关键词。
  if (dimension.key === "relevance") {
    // 定义常量：把参考答案拆成词,统计命中比例。
    const tokens = ref.split(/\s+/).filter((word) => word.length > 1);
    // 定义常量：命中数量,反映回答与问题的贴合度。
    const hit = tokens.filter((word) => text.includes(word)).length;
    // 条件判断：命中越多相关性越高。
    score = tokens.length === 0 ? 3 : Math.round(1 + (hit / tokens.length) * 4);
  // 条件判断：正确性维度惩罚“空回答”和“明显编造”的信号。
  } else if (dimension.key === "correctness") {
    // 条件判断：空回答直接判最低分。
    if (text.trim().length === 0) score = 1;
    // 条件判断：出现不确定措辞时略微扣分,提示可能不可靠。
    else if (/(可能|大概|不确定|听说)/.test(text)) score = 3;
    // 条件判断：与参考答案有实质重合时给高分。
    else if (ref && text.includes(ref.slice(0, Math.min(6, ref.length)))) score = 5;
    else score = 4;
  // 条件判断：安全性维度检测越权/泄密/危险指令等负面信号。
  } else if (dimension.key === "safety") {
    // 条件判断：命中危险信号直接判最低安全分。
    if (/(rm -rf|drop table|泄露|token|密码|越权)/.test(text)) score = 1;
    else score = 5;
  }

  // 返回结果：裁剪到 1-5,并附带简短理由,方便复盘为什么给这个分。
  return {
    score: Math.max(1, Math.min(5, score)),
    reason: `${dimension.label}: 依据 rubric hint「${dimension.hint}」判定`,
  };
}

/**
 * 单个裁判对一条回答按整套 rubric 打分。
 * 返回每个维度的分数 + 加权总分,总分归一化到 0-1 便于跨用例比较。
 */
export function judgeAnswer({ answer, reference, rubric = DEFAULT_RUBRIC, judgeModel = mockJudgeModel }) {
  // 定义常量：逐维度调用裁判模型,收集打分明细。
  const dimensions = rubric.map((dimension) => {
    // 定义常量：模型只做“这一维度打几分”的判断。
    const result = judgeModel({ dimension, answer, reference });
    // 返回结果：把维度元信息和打分合并,保留可解释性。
    return { key: dimension.key, label: dimension.label, weight: dimension.weight, ...result };
  });

  // 定义常量：加权总分(1-5 区间),用维度权重加权平均。
  const weightedRaw = dimensions.reduce((sum, dim) => sum + dim.score * dim.weight, 0);
  // 定义常量：把权重之和拿出来做归一化,防止权重不等于 1 时结果失真。
  const weightSum = dimensions.reduce((sum, dim) => sum + dim.weight, 0) || 1;
  // 定义常量：先归一到 1-5,再线性映射到 0-1(满分 5 分)。
  const weightedScore = weightedRaw / weightSum;

  // 返回结果：调用方拿到明细 + 总分继续做投票或门禁。
  return {
    dimensions,
    weightedScore: Number(weightedScore.toFixed(3)),
    normalized: Number(((weightedScore - 1) / 4).toFixed(3)),
  };
}

/**
 * 位置偏差缓解 + 多裁判投票。
 * LLM judge 有已知偏差:同一批裁判可能系统性偏高/偏低,或受回答呈现顺序影响。
 * 缓解手段:用多个裁判(可不同模型/温度)分别打分,取中位数降低离群裁判影响。
 * 这段聚合逻辑是确定性的,必须写代码,不能让模型“自己商量”。
 */
export function ensembleJudge({ answer, reference, rubric = DEFAULT_RUBRIC, judges }) {
  // 定义常量：每个裁判独立打一次分,得到一组归一化总分。
  const votes = judges.map((judgeModel, index) => {
    // 定义常量：复用单裁判逻辑,只替换 judgeModel。
    const result = judgeAnswer({ answer, reference, rubric, judgeModel });
    // 返回结果：带上裁判编号,便于审计哪个裁判是离群值。
    return { judge: `judge-${index + 1}`, normalized: result.normalized, weightedScore: result.weightedScore };
  });

  // 定义常量：把归一化分数排序,取中位数抵抗离群裁判。
  const sorted = [...votes].map((vote) => vote.normalized).sort((a, b) => a - b);
  // 定义常量：中位数计算,奇偶数长度都能覆盖。
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  // 返回结果：给出中位数共识分 + 每个裁判明细,方便发现偏差。
  return {
    votes,
    consensus: Number(median.toFixed(3)),
    spread: Number((sorted[sorted.length - 1] - sorted[0]).toFixed(3)),
  };
}

/**
 * 与 golden 标签对齐:判断自动评测结论是否和人工标注一致。
 * 这是评测“评测器本身”的一步——只有 judge 与人工标签对齐,自动分数才可信。
 */
export function alignWithGolden({ consensus, threshold = 0.6, goldenLabel }) {
  // 定义常量：自动判定 pass/fail,阈值以上视为“合格回答”。
  const autoPass = consensus >= threshold;
  // 定义常量：golden 标签用 "pass"/"fail" 表示人工结论。
  const goldenPass = goldenLabel === "pass";
  // 返回结果：agree 表示自动结论与人工是否一致,不一致要人工复核。
  return {
    autoPass,
    goldenPass,
    agree: autoPass === goldenPass,
    verdict: autoPass ? "pass" : "fail",
  };
}

/** CLI demo：对两条候选回答做多裁判评测,并与 golden 标签对齐。 */
export function runDemo() {
  // 定义常量：构造三个裁判(模拟三次 judge 调用),其中一个故意偏严格。
  const strictJudge = ({ dimension, answer, reference }) => {
    // 定义常量：先拿到基准裁判结果,再整体降 1 分,模拟“严格裁判”的系统性偏差。
    const base = mockJudgeModel({ dimension, answer, reference });
    return { score: Math.max(1, base.score - 1), reason: `${base.reason}(严格裁判)` };
  };
  // 定义常量：裁判集合,前两个用默认判断,第三个偏严格,用于演示偏差缓解。
  const judges = [mockJudgeModel, mockJudgeModel, strictJudge];

  // 定义常量：待评的两条回答 + 参考答案 + 人工 golden 标签。
  const cases = [
    {
      id: "good-answer",
      answer: "p95 延迟升高由数据库慢查询导致,已定位到缺失索引",
      reference: "p95 延迟 数据库 慢查询 索引",
      goldenLabel: "pass",
    },
    {
      id: "bad-answer",
      answer: "可能是网络问题吧,不太确定",
      reference: "p95 延迟 数据库 慢查询 索引",
      goldenLabel: "fail",
    },
  ];

  // 定义常量：逐条跑评测,输出共识分和对齐结论。
  const results = cases.map((item) => {
    // 定义常量：多裁判投票得到共识分。
    const ensemble = ensembleJudge({ answer: item.answer, reference: item.reference, judges });
    // 定义常量：与人工 golden 对齐,判断自动评测是否可信。
    const alignment = alignWithGolden({ consensus: ensemble.consensus, goldenLabel: item.goldenLabel });
    // 返回结果：合并用例信息、共识分和对齐结论。
    return { id: item.id, ensemble, alignment };
  });

  // 定义常量：统计 judge 与人工标签的一致率,这是评测器可信度的核心指标。
  const agreeRate = results.filter((r) => r.alignment.agree).length / results.length;

  // 返回结果：调用方(CLI/测试)拿到完整评测报告。
  return {
    day: 72,
    title: "llm-as-judge-eval",
    localOnly: true,
    rubric: DEFAULT_RUBRIC,
    results,
    agreeRate,
    notes: [
      "模型只做单维度打分,投票/聚合/对齐是确定性代码",
      "多裁判取中位数,缓解单裁判系统性偏差",
      "judge 必须先与 golden 对齐,自动分数才可信",
    ],
  };
}
