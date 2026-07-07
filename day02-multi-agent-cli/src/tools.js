/**
 * Day 2：自包含学习源码。
 *
 * 这个文件属于 day02-multi-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
/**
 * Day 02：本地工具集合。
 *
 * 多 agent 示例只需要少量 read-only 工具。这里把工具实现放在 day02 内，
 * 让本 day 可以完全独立运行和修改。
 */

/** 统一成功返回格式，方便 tool-runner 生成 observation。 */
function ok(data) {
  return { ok: true, data };
}

/** 统一失败返回格式，避免工具异常直接打断教学流程。 */
function fail(error) {
  return { ok: false, error };
}

/** 只允许安全字符的四则运算工具。 */
function calculate(input = {}) {
  const expression = input.expression;
  if (typeof expression !== 'string' || !expression.trim()) {
    return fail('calculator 需要 input.expression');
  }
  if (!/^[0-9+\-*/%().\s]+$/.test(expression)) {
    return fail('表达式包含不允许的字符');
  }
  try {
    // 教学项目中用 Function 只处理已过滤的算术表达式；真实产品应使用解析器。
    const value = Function(`"use strict"; return (${expression})`)();
    return Number.isFinite(value) ? ok({ expression, value }) : fail('计算结果不是有限数字');
  } catch (error) {
    return fail(error.message);
  }
}

/** 读取当前时间，模拟 read-only 工具。 */
function currentTime() {
  const now = new Date();
  return ok({ iso: now.toISOString(), text: now.toLocaleString('zh-CN') });
}

/** 本地 notes 搜索 mock，演示工具 observation 的形状。 */
function searchNotes(input = {}) {
  const query = typeof input.query === 'string' ? input.query : '';
  return ok({
    query,
    matches: query ? [`本地 mock notes 命中：${query}`] : [],
  });
}

/** 根据工具名执行本 day 内置工具。 */
// 导出异步函数：调用方需要 await 它，因为内部可能读文件、请求接口或等待模型。
export async function runTool(name, input = {}) {
  // switch 分发：根据一个固定字段选择要执行的工具或分支。
  switch (name) {
    // case 分支：匹配到这个值时执行对应逻辑。
    case 'calculator':
      return calculate(input);
    // case 分支：匹配到这个值时执行对应逻辑。
    case 'current_time':
      return currentTime(input);
    // case 分支：匹配到这个值时执行对应逻辑。
    case 'search_notes':
      return searchNotes(input);
    // default 分支：没有任何 case 匹配时走这里，通常用于报错或兜底。
    default:
      return fail(`未知工具: ${name}`);
  }
}

