/**
 * three-year-goals：命令行入口。
 *
 * 运行这个文件后，会直接打印基于默认画像生成的三年学习项目建议。
 */

import { buildThreeYearLearningProject, renderLearningProject } from "./index.js";

// 这里固定使用默认画像，目标是先让项目可运行、可观察、可测试。
const report = buildThreeYearLearningProject();

// CLI 只负责输出，不在这里混入计算逻辑。
console.log(renderLearningProject(report));
