/**
 * Day 6：自包含学习源码。
 *
 * 这个文件属于 day06-evaluation-observability，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
import assert from 'node:assert/strict';

import { evaluateCase, loadCases, runEvaluations, runMockAgent } from '../src/eval-runner.js';

const cases = await loadCases();
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(cases.length >= 3);

const mock = await runMockAgent('计算 2+3*4');
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(mock.events.some((event) => event.tool === 'calculator'));

const single = evaluateCase({
  id: 'case-1',
  expectedTool: 'calculator',
  expectedText: '14',
}, mock);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(single.passed, true);

const report = await runEvaluations({ cases });
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(report.summary.failed, 0);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(report.summary.total, cases.length);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(report.summary.modelCalls >= cases.length);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(report.summary.toolCalls >= cases.length);
// 测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(report.results[0].trace.events.length > 0);

console.log('day06 tests passed');

