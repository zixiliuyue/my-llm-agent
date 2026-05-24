import assert from 'node:assert/strict';

import { evaluateCase, loadCases, runEvaluations, runMockAgent } from '../src/eval-runner.js';

const cases = await loadCases();
assert.ok(cases.length >= 3);

const mock = await runMockAgent('计算 2+3*4');
assert.ok(mock.events.some((event) => event.tool === 'calculator'));

const single = evaluateCase({
  id: 'case-1',
  expectedTool: 'calculator',
  expectedText: '14',
}, mock);
assert.equal(single.passed, true);

const report = await runEvaluations({ cases });
assert.equal(report.summary.failed, 0);
assert.equal(report.summary.total, cases.length);
assert.ok(report.summary.modelCalls >= cases.length);
assert.ok(report.summary.toolCalls >= cases.length);
assert.ok(report.results[0].trace.events.length > 0);

console.log('day06 tests passed');

