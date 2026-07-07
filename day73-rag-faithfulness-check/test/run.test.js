/**
 * Day 73 测试：验证拆句、单句证据支撑判定和整体 faithfulness 聚合。
 */
import assert from "node:assert/strict";
import { splitSentences, checkSentenceSupport, evaluateFaithfulness, runDemo } from "../src/index.js";

// 定义常量：拆句应正确切分中英文句子。
const sentences = splitSentences("第一句话。第二句话！third one.");
// 测试断言：确认核心行为符合预期,失败时会抛出明确错误。
assert.equal(sentences.length, 3);

// 定义常量：证据集合,用于单句支撑判定。
const evidences = [{ id: "doc:1", text: "数据库慢查询导致延迟升高,需要补索引" }];
// 定义常量：与证据高度重合的句子,应判 supported。
const supported = checkSentenceSupport({ sentence: "延迟升高是数据库慢查询导致", evidences });
// 测试断言：支撑句应命中来源。
assert.equal(supported.verdict, "supported");
assert.equal(supported.source, "doc:1");

// 定义常量：证据里完全没有的句子,应判 hallucination。
const hallucination = checkSentenceSupport({ sentence: "机房断电导致服务器起火", evidences });
// 测试断言：无依据句应判为 hallucination 且无来源。
assert.equal(hallucination.verdict, "hallucination");
assert.equal(hallucination.source, null);

// 定义常量：一条完全忠于证据的答案,faithfulness 应为满分且 action=accept。
const clean = evaluateFaithfulness({ answer: "数据库慢查询导致延迟升高,需要补索引。", evidences });
// 测试断言：忠于证据的答案应被接受。
assert.equal(clean.faithfulness, 1);
assert.equal(clean.action, "accept");

// 定义常量：一条半真半假的答案,应标出幻觉句并建议 revise。
const mixed = evaluateFaithfulness({
  answer: "数据库慢查询导致延迟升高。此外机房断电也是原因,应更换供应商。",
  evidences,
});
// 测试断言：应至少标记出一条幻觉句。
assert.ok(mixed.hallucinations.length >= 1, "应标记出无依据句");
// 测试断言：半真半假答案不应直接 accept。
assert.notEqual(mixed.action, "accept");

// 定义常量：跑完整 demo,验证端到端产物结构。
const demo = runDemo();
// 测试断言：确认 day 编号正确。
assert.equal(demo.day, 73);
// 测试断言：忠于证据的答案 faithfulness 应高于夹带幻觉的答案。
assert.ok(demo.faithful.faithfulness > demo.hallucinated.faithfulness);

console.log("day73 tests passed");
