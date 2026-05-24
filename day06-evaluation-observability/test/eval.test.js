// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from 'node:assert/strict';

// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { evaluateCase, loadCases, runEvaluations, runMockAgent } from '../src/eval-runner.js';

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const cases = await loadCases();
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(cases.length >= 3);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const mock = await runMockAgent('计算 2+3*4');
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(mock.events.some((event) => event.tool === 'calculator'));

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const single = evaluateCase({
  id: 'case-1',
  expectedTool: 'calculator',
  expectedText: '14',
}, mock);
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(single.passed, true);

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const report = await runEvaluations({ cases });
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(report.summary.failed, 0);
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.equal(report.summary.total, cases.length);
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(report.summary.modelCalls >= cases.length);
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(report.summary.toolCalls >= cases.length);
// 教学：测试断言：如果实际值不符合预期，测试会立即失败。
assert.ok(report.results[0].trace.events.length > 0);

// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log('day06 tests passed');

