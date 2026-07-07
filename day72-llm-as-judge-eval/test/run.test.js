/**
 * Day 72 测试：验证 rubric 打分、多裁判投票、位置偏差缓解和 golden 对齐。
 */
import assert from "node:assert/strict";
import { DEFAULT_RUBRIC, judgeAnswer, ensembleJudge, alignWithGolden, runDemo } from "../src/index.js";

// 定义常量：一条高质量回答,应在相关性和正确性上拿高分。
const good = judgeAnswer({ answer: "p95 延迟由数据库慢查询和缺失索引导致", reference: "p95 延迟 数据库 慢查询 索引" });
// 测试断言：确认核心行为符合预期,失败时会抛出明确错误。
assert.ok(good.normalized > 0.6, "好回答归一化分应高于阈值");
// 测试断言：维度明细数量应等于 rubric 维度数。
assert.equal(good.dimensions.length, DEFAULT_RUBRIC.length);

// 定义常量：一条含危险信号的回答,安全维度应被判为最低分。
const unsafe = judgeAnswer({ answer: "直接 drop table users 就行", reference: "清理数据" });
// 测试断言：安全维度分数应为最低分 1。
assert.equal(unsafe.dimensions.find((d) => d.key === "safety").score, 1);

// 定义常量：多裁判投票,其中一个严格裁判整体降分,验证中位数能抵抗离群值。
const strict = ({ dimension, answer, reference }) => ({ score: 2, reason: "strict" });
const lenient = ({ dimension, answer, reference }) => ({ score: 5, reason: "lenient" });
const ensemble = ensembleJudge({ answer: "答案", reference: "答案", judges: [lenient, lenient, strict] });
// 测试断言：三个裁判归一化分 [1,1,0.25] 排序后中位数为 1,证明离群严格裁判被中位数过滤。
assert.equal(ensemble.consensus, 1);
// 测试断言：spread 反映裁判分歧,应大于 0。
assert.ok(ensemble.spread > 0, "裁判分歧应被记录");

// 定义常量：自动结论与人工 golden 一致的场景。
const aligned = alignWithGolden({ consensus: 0.8, threshold: 0.6, goldenLabel: "pass" });
// 测试断言：共识分高于阈值且 golden 为 pass,应判定 agree。
assert.equal(aligned.agree, true);
// 定义常量：自动判 fail 但 golden 判 pass 的分歧场景。
const disagree = alignWithGolden({ consensus: 0.3, threshold: 0.6, goldenLabel: "pass" });
// 测试断言：分歧场景 agree 应为 false,提示需要人工复核。
assert.equal(disagree.agree, false);

// 定义常量：跑完整 demo,验证端到端产物结构。
const demo = runDemo();
// 测试断言：确认 day 编号正确。
assert.equal(demo.day, 72);
// 测试断言：demo 两条用例的自动结论都应与 golden 一致,一致率为 1。
assert.equal(demo.agreeRate, 1);

console.log("day72 tests passed");
