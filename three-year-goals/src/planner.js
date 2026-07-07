/**
 * three-year-goals：规划核心逻辑。
 *
 * 这个文件负责把“当前技能画像”和“未来三年趋势”转换成具体优先级、
 * 年度目标、季度计划和真实练手场景。
 */

// 导入依赖：读取默认趋势和练手场景定义。
import { PRACTICE_SCENARIOS, TREND_CATALOG, createDefaultUserProfile } from "./data.js";

// 普通函数：把数值限制在指定范围内，避免输入异常导致排序失真。
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// 普通函数：计算某条趋势对应的当前准备度。
function calculateTrendReadiness(skillScores, trend) {
  const values = trend.relatedSkills
    .map((skillId) => Number(skillScores[skillId] ?? 0))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(2));
}

// 导出函数：基于默认画像或自定义画像计算技能分析结果。
export function analyzeSkillProfile(profile = createDefaultUserProfile(), trendCatalog = TREND_CATALOG) {
  const skillEntries = Object.entries(profile.skillScores);
  const sortedSkills = [...skillEntries].sort((left, right) => right[1] - left[1]);
  const strengths = sortedSkills.slice(0, 4).map(([id, score]) => ({ id, score }));
  const gaps = [...sortedSkills].reverse().slice(0, 4).map(([id, score]) => ({ id, score }));

  const trendFit = trendCatalog
    .map((trend) => {
      const readiness = calculateTrendReadiness(profile.skillScores, trend);
      // 优先级不是简单看差值，还要叠加趋势权重。
      const urgency = Number((trend.weight * 1.5 - readiness).toFixed(2));
      return {
        id: trend.id,
        label: trend.label,
        summary: trend.summary,
        readiness,
        urgency,
      };
    })
    .sort((left, right) => right.urgency - left.urgency);

  return {
    profile,
    strengths,
    gaps,
    trendFit,
  };
}

// 普通函数：为学习方向生成一句有因果的说明，而不是只有标题。
function explainFocusArea(focusId) {
  const reasons = {
    "platform-engineering": "你已经具备 CLI、发布、排障和配置场景基础，补齐平台抽象能力后杠杆最大。",
    "ai-engineering": "未来三年会大量出现 Agent 接系统的需求，现在补 eval、tool、RAG、质量门禁最划算。",
    "reliability-observability": "你的根因排查能力已经很强，继续补 SLO、OTel、指标体系会更容易形成壁垒。",
    "security-governance": "AI 工作流一旦接权限和执行能力，审批、审计、脱敏和治理就是必修课。",
    "tool-productization": "你已经会做 CLI 和定点前端修补，下一步应该把零散能力产品化。",
  };
  return reasons[focusId] ?? "这个方向和你的已有能力有较强迁移关系。";
}

// 普通函数：为每一年安排主线，保证先补底座，再做 AI 平台化整合。
function createYearGoals(trendFit) {
  const topIds = trendFit.map((item) => item.id);
  const has = (id) => topIds.includes(id);

  const year1Focus = [
    has("platform-engineering") ? "platform-engineering" : topIds[0],
    has("reliability-observability") ? "reliability-observability" : topIds[1],
    has("tool-productization") ? "tool-productization" : topIds[2],
  ];

  const year2Focus = [
    "ai-engineering",
    "security-governance",
    "tool-productization",
  ];

  const year3Focus = [
    "platform-engineering",
    "ai-engineering",
    "security-governance",
  ];

  return [
    {
      year: 1,
      theme: "把平台底座补齐",
      focusIds: year1Focus,
      outcome: "能独立做出可发布、可观测、可回滚、可测试的内部工具。",
    },
    {
      year: 2,
      theme: "把 AI 接进真实工程流程",
      focusIds: year2Focus,
      outcome: "能做带权限边界、评测和审计的 Agent 工作流，而不是玩具 demo。",
    },
    {
      year: 3,
      theme: "从实现者升级到平台 owner",
      focusIds: year3Focus,
      outcome: "能主导自助式 AI 平台、治理规则和团队级 golden path。",
    },
  ];
}

// 普通函数：给每个季度分配明确主题，避免年度目标过于抽象。
function buildQuarterPlan(yearGoal) {
  const quarterTemplates = {
    1: [
      {
        quarter: "Q1",
        title: "Kubernetes、发布与回滚基线",
        mission: "补齐 K8s、Helm、配置热更新、进程生命周期和回滚路径。",
      },
      {
        quarter: "Q2",
        title: "指标、日志、Trace 与慢查询证据链",
        mission: "建立观测链可信度判断，而不是只看单条日志。",
      },
      {
        quarter: "Q3",
        title: "CLI 产品化与风险守卫",
        mission: "把发布前检查、quiet 模式、审批草案、回滚说明做成标准命令面。",
      },
      {
        quarter: "Q4",
        title: "平台底座整合项目",
        mission: "完成第一个可演示的内部工具样板，覆盖配置、发布、观测和审计。",
      },
    ],
    2: [
      {
        quarter: "Q1",
        title: "RAG、工具调用与评测集",
        mission: "建立 AI 工程最小闭环：知识检索、工具调用、回放与质量评测。",
      },
      {
        quarter: "Q2",
        title: "权限、审批、脱敏与安全治理",
        mission: "让 Agent 对系统的任何外部动作都可被过滤、审批和审计。",
      },
      {
        quarter: "Q3",
        title: "AI 运维诊断工作流",
        mission: "把观测、权限、SQL、审批和复盘编成完整 dry-run 流程。",
      },
      {
        quarter: "Q4",
        title: "AI 工程代表作封装",
        mission: "把实验收敛成可讲述、可测试、可复用的作品集项目。",
      },
    ],
    3: [
      {
        quarter: "Q1",
        title: "平台治理、SLO 与成本边界",
        mission: "建立平台 owner 视角：指标、容量、成本、SLO 和错误预算。",
      },
      {
        quarter: "Q2",
        title: "多 Agent 编排与长期记忆",
        mission: "补齐 handoff、共享状态、冲突处理、预算、超时与部分失败。",
      },
      {
        quarter: "Q3",
        title: "Golden Path 与模板体系",
        mission: "把最佳实践变成项目模板、脚手架和默认工作流。",
      },
      {
        quarter: "Q4",
        title: "自助式 Agent 平台终局项目",
        mission: "完成一个带权限、审计、灰度和回滚的内部平台原型。",
      },
    ],
  };

  return quarterTemplates[yearGoal.year].map((quarterPlan) => ({
    ...quarterPlan,
    focus: yearGoal.focusIds.map((focusId) => ({
      id: focusId,
      reason: explainFocusArea(focusId),
    })),
  }));
}

// 导出函数：把年度目标展开成完整三年路线图。
export function buildThreeYearRoadmap(profile = createDefaultUserProfile()) {
  const analysis = analyzeSkillProfile(profile);
  const yearGoals = createYearGoals(analysis.trendFit);

  return yearGoals.map((yearGoal) => ({
    ...yearGoal,
    quarters: buildQuarterPlan(yearGoal),
  }));
}

// 导出函数：选择与你画像最匹配的真实场景项目。
export function buildScenarioBacklog(profile = createDefaultUserProfile()) {
  const skillScores = profile.skillScores;

  return PRACTICE_SCENARIOS.map((scenario) => {
    const matchedSkills = scenario.requiredSkills.map((skillId) => ({
      skillId,
      score: Number(skillScores[skillId] ?? 0),
    }));
    const averageScore =
      matchedSkills.reduce((sum, item) => sum + item.score, 0) / matchedSkills.length;

    return {
      ...scenario,
      readiness: Number(averageScore.toFixed(2)),
      risk: clamp(Number((4.8 - averageScore).toFixed(2)), 0, 5),
    };
  }).sort((left, right) => left.year - right.year || right.readiness - left.readiness);
}

// 导出函数：生成每周执行节奏，帮助路线图落地。
export function buildWeeklyCadence() {
  return [
    "每周 2 次 90 分钟：补基础设施底层概念，优先看和当前项目直接相关的资料。",
    "每周 1 次 120 分钟：做一个真实场景练手，不接受纯概念学习。",
    "每周 1 次 60 分钟：写复盘，记录失败原因、证据链、回滚路径和下一步补洞。",
    "每月 1 次：把一个练手题收敛成作品集条目，包括 README、测试和演示脚本。",
  ];
}

// 导出函数：给 CLI 和测试提供统一的完整结果对象。
export function buildThreeYearLearningProject(profile = createDefaultUserProfile()) {
  const analysis = analyzeSkillProfile(profile);
  const roadmap = buildThreeYearRoadmap(profile);
  const scenarios = buildScenarioBacklog(profile);
  const weeklyCadence = buildWeeklyCadence();

  return {
    title: "未来三年学习项目",
    profile,
    analysis,
    roadmap,
    scenarios,
    weeklyCadence,
  };
}
