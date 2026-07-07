/**
 * three-year-goals：文本渲染。
 *
 * 这个文件只负责把规划结果变成人能快速浏览的输出，
 * 不参与排序和计算，方便以后替换成 Web 页面或 JSON API。
 */

// 普通函数：把技能 id 转成更可读的中文名字。
function formatSkillId(skillId) {
  const mapping = {
    go_backend: "Go 后端",
    root_cause_debugging: "根因排障",
    cli_productization: "CLI 产品化",
    delivery: "发布与测试环境",
    frontend_patch: "前端定点修补",
    data_modeling: "数据建模",
    observability: "可观测",
    platform_architecture: "平台架构",
    kubernetes: "Kubernetes",
    agent_engineering: "Agent 工程",
    evaluation: "评测体系",
    security_governance: "安全治理",
    productization: "工具产品化",
  };
  return mapping[skillId] ?? skillId;
}

// 导出函数：生成适合终端阅读的完整文本。
export function renderLearningProject(report) {
  const lines = [];

  lines.push(`# ${report.title}`);
  lines.push("");
  lines.push("## 画像判断");
  lines.push(`- 当前定位：${report.profile.summary}`);
  lines.push(`- 优势：${report.analysis.strengths.map((item) => `${formatSkillId(item.id)} ${item.score}`).join("、")}`);
  lines.push(`- 短板：${report.analysis.gaps.map((item) => `${formatSkillId(item.id)} ${item.score}`).join("、")}`);
  lines.push("");
  lines.push("## 趋势优先级");

  for (const trend of report.analysis.trendFit) {
    lines.push(`- ${trend.label}：准备度 ${trend.readiness}，优先级 ${trend.urgency}。${trend.summary}`);
  }

  lines.push("");
  lines.push("## 三年路线图");

  for (const year of report.roadmap) {
    lines.push(`- 第 ${year.year} 年：${year.theme}。目标：${year.outcome}`);
    for (const quarter of year.quarters) {
      const reasons = quarter.focus.map((focus) => focus.reason).join(" / ");
      lines.push(`  ${quarter.quarter} ${quarter.title}：${quarter.mission} 关注原因：${reasons}`);
    }
  }

  lines.push("");
  lines.push("## 真实练手项目");

  for (const scenario of report.scenarios) {
    lines.push(`- ${scenario.title}：第 ${scenario.year} 年优先，当前可承接度 ${scenario.readiness}。${scenario.description}`);
  }

  lines.push("");
  lines.push("## 每周节奏");

  for (const item of report.weeklyCadence) {
    lines.push(`- ${item}`);
  }

  return lines.join("\n");
}
