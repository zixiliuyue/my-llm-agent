/**
 * three-year-goals：默认数据定义。
 *
 * 这个文件只负责放静态数据和默认画像，不做复杂计算。
 * 这样学习时可以先看“输入是什么”，再去理解规划逻辑。
 */

// 定义常量：未来三年最值得投资的能力方向。
export const TREND_CATALOG = [
  {
    id: "ai-engineering",
    label: "AI 工程化",
    weight: 5,
    summary: "重点不是 prompt 花活，而是 tool、RAG、eval、成本、权限与审计。",
    relatedSkills: ["agent_engineering", "evaluation", "productization", "security_governance"],
  },
  {
    id: "platform-engineering",
    label: "平台工程",
    weight: 5,
    summary: "把配置、发布、回滚、脚手架、golden path 做成团队可复用平台。",
    relatedSkills: ["platform_architecture", "kubernetes", "delivery", "cli_productization"],
  },
  {
    id: "reliability-observability",
    label: "可靠性与可观测",
    weight: 4,
    summary: "会看日志还不够，需要能建立 SLO、指标、trace、根因证据链。",
    relatedSkills: ["root_cause_debugging", "observability", "data_modeling", "go_backend"],
  },
  {
    id: "security-governance",
    label: "安全与治理",
    weight: 4,
    summary: "未来 Agent 接系统后，权限边界、审批、审计、脱敏会变成硬门槛。",
    relatedSkills: ["security_governance", "delivery", "agent_engineering", "cli_productization"],
  },
  {
    id: "tool-productization",
    label: "内部工具产品化",
    weight: 4,
    summary: "真正高杠杆的是把零散运维动作做成稳定 CLI、页面和模板。",
    relatedSkills: ["cli_productization", "frontend_patch", "platform_architecture", "productization"],
  },
];

// 导出函数：生成与你当前画像贴近的默认技能输入。
export function createDefaultUserProfile() {
  return {
    name: "平台工程 / AI 工程化转型学习者",
    summary: "强项在真实链路排障、Go 后端、CLI 和测试环境闭环，短板集中在 K8s、AI 工程化体系化、安全治理。",
    strengths: [
      "会沿真实代码、配置、队列和环境链路追根因。",
      "对 Go 后端、CLI、配置中心、测试环境发布有持续实践。",
      "更偏平台和工程化，不是只做单点页面开发。",
    ],
    skillScores: {
      go_backend: 4.6,
      root_cause_debugging: 4.8,
      cli_productization: 4.4,
      delivery: 4.1,
      frontend_patch: 3.1,
      data_modeling: 3.5,
      observability: 3.0,
      platform_architecture: 3.2,
      kubernetes: 2.0,
      agent_engineering: 2.5,
      evaluation: 2.2,
      security_governance: 2.6,
      productization: 3.5,
    },
    constraints: [
      "希望练习尽量贴近真实工程问题，而不是脱离上下文的小 demo。",
      "更适合通过可运行项目学习，而不是只看课程。",
      "代码和说明优先中文，重视验证、回滚和风险边界。",
    ],
  };
}

// 定义常量：真实练手题要贴近你已有工作场景，才有作品集价值。
export const PRACTICE_SCENARIOS = [
  {
    id: "configcenter-consumer-lab",
    title: "配置中心消费链路脏数据容错实验",
    year: 1,
    description: "模拟 agent 上报脏磁盘字段，要求 consumer 保持 ACK、清洗脏值、落证据并保证读路径继续可用。",
    whyImportant: "它直接锻炼消费链路设计、数据容错、可观测和 Go 工程能力，是你最容易转化为中高价值平台能力的题。",
    deliverables: [
      "Go 或 Node mock consumer",
      "脏数据样例集",
      "清洗前后对比报告",
      "单元测试和失败用例",
    ],
    requiredSkills: ["go_backend", "root_cause_debugging", "observability", "data_modeling"],
  },
  {
    id: "release-guard-cli-lab",
    title: "发布前检查与回滚守卫 CLI",
    year: 1,
    description: "把环境检查、审批说明、回滚路径、quiet 输出和风险判断做成一条命令。",
    whyImportant: "这会把你现有的 CLI 和测试环境经验升级为平台化交付能力。",
    deliverables: [
      "自包含 CLI",
      "风险操作 dry-run 报告",
      "quiet 模式",
      "测试环境检查清单",
    ],
    requiredSkills: ["cli_productization", "delivery", "platform_architecture", "security_governance"],
  },
  {
    id: "agent-ops-evidence-board",
    title: "AI 运维诊断证据板",
    year: 2,
    description: "把观测、权限、审批、SQL 草案、复盘质量串成一个只能 dry-run 的多 Agent 工程闭环。",
    whyImportant: "这是未来三年你最值得做的代表作，因为它同时覆盖 AI 工程、平台工程和安全治理。",
    deliverables: [
      "多 Agent 协调器",
      "证据板和最终报告",
      "权限过滤与审批边界",
      "评测与回放样例",
    ],
    requiredSkills: ["agent_engineering", "evaluation", "security_governance", "productization"],
  },
  {
    id: "self-service-agent-platform-capstone",
    title: "自助式 Agent 平台终局项目",
    year: 3,
    description: "把模型路由、知识库、审批、可观测、灰度、回滚、模板化脚手架收敛成可复用内部平台。",
    whyImportant: "它对应的是从高级工程师向平台负责人或 AI 平台 owner 的跃迁。",
    deliverables: [
      "平台架构图",
      "最小可运行控制面",
      "审计日志与权限模型",
      "灰度和回滚策略",
    ],
    requiredSkills: ["platform_architecture", "kubernetes", "agent_engineering", "security_governance"],
  },
];
