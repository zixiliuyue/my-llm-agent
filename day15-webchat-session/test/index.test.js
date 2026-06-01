/**
 * Day 15：自包含学习源码。
 *
 * 这个文件属于 day15-webchat-session，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// node:assert/strict 提供严格断言；断言失败会让 npm test 退出非 0。
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from 'node:assert/strict';

// 从当天核心文件导入要测试的公开能力。
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createDemoInput, lesson, runDemo, validateDemo } from '../src/index.js';

// 构造一个自定义输入，验证 overrides 能覆盖默认 message。
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const input = createDemoInput({ message: 'test message' });
// mode 应该固定为 mock，表示测试不会触发真实模型或远程副作用。
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(input.mode, 'mock');

// 运行当天 demo，拿到统一结构结果。
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const result = runDemo(input);
// ok=true 表示主流程成功。
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(result.ok, true);
// lesson.day 必须等于当天编号，防止目录和元信息不一致。
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(result.lesson.day, '15');
// events 必须有内容，因为事件流是本项目学习 mini-openclaw 的核心输出。
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(result.events.length > 0);
// safeMode 必须为 true，保证教学示例没有真实副作用。
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(result.summary.safeMode, true);

// validateDemo 再检查一次结果对象，模拟 CLI 运行时的校验流程。
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const validation = validateDemo(result);
// validation.ok=true 表示结果通过安全边界校验。
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(validation.ok, true);
// concepts 非空，说明 README/CLI 能展示今天的学习目标。
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(lesson.concepts.length > 0);
// artifacts 非空，说明今天至少有一个可观察产物。
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(lesson.artifacts.length > 0);

// 测试通过时输出固定文本，方便 smoke runner 观察。
// 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log('day15 tests passed');
