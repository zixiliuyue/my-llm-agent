/**
 * Day 34：自包含学习源码。
 *
 * 这个文件属于 day34-image-job-queue-ui，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：用本地队列状态管理长耗时图片任务，避免 UI 阻塞。
// 定义变量：这个值后面会被更新，所以使用 let。
let nextId = 1;

// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function now() {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return new Date().toISOString();
}

// 创建图片任务记录；这里只保存元数据，不真正调用 ComfyUI。
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createImageJob({ prompt, provider = "comfy:image", workflow = "sdxl-base" }) {
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!prompt || typeof prompt !== "string") {
    // 抛出错误：让调用方知道当前流程不能继续。
    throw new Error("prompt is required");
  }
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    id: `img-${nextId++}`,
    prompt,
    provider,
    workflow,
    status: "queued",
    progress: 0,
    createdAt: now(),
    updatedAt: now(),
  };
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function transitionJob(job, event) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const updatedAt = now();
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (event.type === "start") {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return { ...job, status: "running", progress: Math.max(job.progress, 1), updatedAt };
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (event.type === "progress") {
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const progress = Math.min(99, Math.max(job.progress, event.progress));
    // 返回结果：调用方会拿到这个值继续后续流程。
    return { ...job, status: "running", progress, updatedAt };
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (event.type === "done") {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return { ...job, status: "done", progress: 100, output: event.output, updatedAt };
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (event.type === "error") {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return { ...job, status: "error", error: event.error ?? "unknown error", updatedAt };
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (event.type === "cancel") {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return { ...job, status: "cancelled", updatedAt };
  }
  // 抛出错误：让调用方知道当前流程不能继续。
  throw new Error(`unsupported job event: ${event.type}`);
}

// 队列 reducer 只处理状态，不碰真实模型服务。
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function reduceQueue(queue, action) {
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (action.type === "enqueue") {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return [...queue, createImageJob(action.payload)];
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (action.type === "update") {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return queue.map((job) => (job.id === action.id ? transitionJob(job, action.event) : job));
  }
  // 抛出错误：让调用方知道当前流程不能继续。
  throw new Error(`unsupported queue action: ${action.type}`);
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function summarizeQueue(queue) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return queue.reduce(
    (summary, job) => {
      summary.total += 1;
      summary[job.status] = (summary[job.status] ?? 0) + 1;
      // 返回结果：调用方会拿到这个值继续后续流程。
      return summary;
    },
    { total: 0, queued: 0, running: 0, done: 0, error: 0, cancelled: 0 }
  );
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createDemoQueue() {
  // 定义变量：这个值后面会被更新，所以使用 let。
  let queue = [];
  // 更新状态：这里会改变前面定义的变量或对象字段。
  queue = reduceQueue(queue, { type: "enqueue", payload: { prompt: "a local study room with one agent console" } });
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const first = queue[0];
  // 更新状态：这里会改变前面定义的变量或对象字段。
  queue = reduceQueue(queue, { type: "update", id: first.id, event: { type: "start" } });
  // 更新状态：这里会改变前面定义的变量或对象字段。
  queue = reduceQueue(queue, { type: "update", id: first.id, event: { type: "progress", progress: 42 } });
  // 更新状态：这里会改变前面定义的变量或对象字段。
  queue = reduceQueue(queue, { type: "enqueue", payload: { prompt: "windows workstation with rtx 5060 ti" } });
  // 返回结果：调用方会拿到这个值继续后续流程。
  return queue;
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo() {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const queue = createDemoQueue();
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 34,
    title: "图片任务队列 UI",
    localOnly: true,
    queue,
    summary: summarizeQueue(queue),
  };
}
