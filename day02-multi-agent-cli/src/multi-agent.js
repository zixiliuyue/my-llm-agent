/**
 * Day 2：自包含学习源码。
 *
 * 这个文件属于 day02-multi-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
/**
 * Day 02：多 Agent 编排入口。
 *
 * 本文件只引用当前 day 内的模块，保证 day02 可以被单独复制、修改和运行。
 */
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createOllamaClient } from './ollama-client.js';
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { runTool } from './tools.js';
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { parseCritique, parseFinal, parsePlan } from './handoff-protocol.js';
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { roleMessages } from './roles.js';

/** 把较长的对象压缩成适合 stderr 展示的摘要。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function preview(value, max = 240) {
  // 序列化对象：把 JS 对象转成 JSON 字符串，便于写入请求体或 stdout。
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  // 返回结果：调用方会拿到这个值继续后续流程。
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

/** tool-runner agent：只负责执行 planner 给出的工具步骤，并返回 observation。 */
// 导出异步函数：调用方需要 await 它，因为内部可能读文件、请求接口或等待模型。
export async function runToolRunner(plan, onEvent = () => {}) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const observations = [];
  // 循环：按顺序处理多条数据或多个步骤。
  for (const step of plan.steps) {
    // 调用函数：把当前数据交给已有逻辑处理。
    onEvent({ role: 'tool-runner', type: 'tool_call', tool: step.tool, id: step.id });
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const result = await runTool(step.tool, step.input);
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const observation = {
      id: step.id,
      tool: step.tool,
      ok: result.ok,
      result: result.ok ? result.data : undefined,
      error: result.ok ? undefined : result.error,
    };
    observations.push(observation);
    // 调用函数：把当前数据交给已有逻辑处理。
    onEvent({ role: 'tool-runner', type: 'observation', preview: preview(observation) });
  }
  // 返回结果：调用方会拿到这个值继续后续流程。
  return { type: 'tool_result', observations };
}

/** 按 planner -> tool-runner -> critic -> writer 的顺序执行一次多 agent 协作。 */
// 导出异步函数：调用方需要 await 它，因为内部可能读文件、请求接口或等待模型。
export async function runMultiAgent({
  question,
  // 更新状态：这里会改变前面定义的变量或对象字段。
  client = createOllamaClient(),
  // 更新状态：这里会改变前面定义的变量或对象字段。
  onEvent = () => {},
} = {}) {
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!question || typeof question !== 'string') {
    // 抛出错误：让调用方知道当前流程不能继续。
    throw new Error('question 不能为空');
  }

  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const plannerRaw = await client.chat(roleMessages('planner', { question }));
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const plan = parsePlan(plannerRaw);
  // 调用函数：把当前数据交给已有逻辑处理。
  onEvent({ role: 'planner', type: 'handoff', preview: preview(plan) });

  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const toolResult = await runToolRunner(plan, onEvent);

  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const criticRaw = await client.chat(roleMessages('critic', { question, plan, toolResult }));
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const critique = parseCritique(criticRaw);
  // 调用函数：把当前数据交给已有逻辑处理。
  onEvent({ role: 'critic', type: 'handoff', preview: preview(critique) });

  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const writerRaw = await client.chat(roleMessages('writer', {
    question,
    plan,
    toolResult,
    critique,
  }));
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const final = parseFinal(writerRaw);
  // 调用函数：把当前数据交给已有逻辑处理。
  onEvent({ role: 'writer', type: 'final', preview: preview(final.answer) });

  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    answer: final.answer,
    plan,
    toolResult,
    critique,
  };
}
