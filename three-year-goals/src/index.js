/**
 * three-year-goals：统一导出入口。
 *
 * 这个文件把数据、规划和渲染能力汇总起来，方便 CLI 与测试复用。
 */

export {
  PRACTICE_SCENARIOS,
  TREND_CATALOG,
  createDefaultUserProfile,
} from "./data.js";

export {
  analyzeSkillProfile,
  buildScenarioBacklog,
  buildThreeYearLearningProject,
  buildThreeYearRoadmap,
  buildWeeklyCadence,
} from "./planner.js";

export { renderLearningProject } from "./render.js";
