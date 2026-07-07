/**
 * three-year-goals：测试入口。
 *
 * 这些测试不依赖外部模型、数据库或网络，只验证路线图生成逻辑和场景映射是否稳定。
 */

import assert from "node:assert/strict";
import {
  buildScenarioBacklog,
  buildThreeYearLearningProject,
  buildThreeYearRoadmap,
  createDefaultUserProfile,
  renderLearningProject,
} from "../src/index.js";

const profile = createDefaultUserProfile();
const roadmap = buildThreeYearRoadmap(profile);

// 三年路线必须固定，避免后续改动把范围缩成一年计划。
assert.equal(roadmap.length, 3);
assert.equal(roadmap[0].year, 1);
assert.equal(roadmap[1].year, 2);
assert.equal(roadmap[2].year, 3);

// 每一年都要落到季度，避免只给空泛年度口号。
for (const year of roadmap) {
  assert.equal(year.quarters.length, 4);
}

// 第一年的重点必须先补平台底座，而不是一上来就做华而不实的多模态 demo。
assert.equal(roadmap[0].theme, "把平台底座补齐");
assert.equal(roadmap[0].quarters[0].title, "Kubernetes、发布与回滚基线");

const scenarios = buildScenarioBacklog(profile);

// 真实练手题必须覆盖你最贴近的三条主线：consumer、CLI、AI 平台闭环。
assert.ok(scenarios.some((item) => item.id === "configcenter-consumer-lab"));
assert.ok(scenarios.some((item) => item.id === "release-guard-cli-lab"));
assert.ok(scenarios.some((item) => item.id === "agent-ops-evidence-board"));

// 年度顺序必须合理：先做平台底座，再进 AI 工程与平台 owner 方向。
assert.equal(scenarios[0].year <= scenarios[1].year, true);

const report = buildThreeYearLearningProject(profile);

// 输出结果至少要包含趋势、路线图和实际场景，才能算完整学习项目。
assert.equal(report.title, "未来三年学习项目");
assert.equal(report.roadmap.length, 3);
assert.equal(report.scenarios.length >= 3, true);
assert.equal(report.weeklyCadence.length, 4);

const text = renderLearningProject(report);

// 渲染结果必须包含关键信息，避免 CLI 只输出空壳。
assert.match(text, /未来三年学习项目/);
assert.match(text, /平台工程/);
assert.match(text, /AI 工程化/);
assert.match(text, /配置中心消费链路脏数据容错实验/);
assert.match(text, /第 1 年/);
assert.match(text, /每周节奏/);

console.log("three-year-goals tests passed");
