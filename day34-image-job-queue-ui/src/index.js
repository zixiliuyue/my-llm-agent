// 学习目标：用本地队列状态管理长耗时图片任务，避免 UI 阻塞。
let nextId = 1;

function now() {
  return new Date().toISOString();
}

// 创建图片任务记录；这里只保存元数据，不真正调用 ComfyUI。
export function createImageJob({ prompt, provider = "comfy:image", workflow = "sdxl-base" }) {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("prompt is required");
  }
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

export function transitionJob(job, event) {
  const updatedAt = now();
  if (event.type === "start") {
    return { ...job, status: "running", progress: Math.max(job.progress, 1), updatedAt };
  }
  if (event.type === "progress") {
    const progress = Math.min(99, Math.max(job.progress, event.progress));
    return { ...job, status: "running", progress, updatedAt };
  }
  if (event.type === "done") {
    return { ...job, status: "done", progress: 100, output: event.output, updatedAt };
  }
  if (event.type === "error") {
    return { ...job, status: "error", error: event.error ?? "unknown error", updatedAt };
  }
  if (event.type === "cancel") {
    return { ...job, status: "cancelled", updatedAt };
  }
  throw new Error(`unsupported job event: ${event.type}`);
}

// 队列 reducer 只处理状态，不碰真实模型服务。
export function reduceQueue(queue, action) {
  if (action.type === "enqueue") {
    return [...queue, createImageJob(action.payload)];
  }
  if (action.type === "update") {
    return queue.map((job) => (job.id === action.id ? transitionJob(job, action.event) : job));
  }
  throw new Error(`unsupported queue action: ${action.type}`);
}

export function summarizeQueue(queue) {
  return queue.reduce(
    (summary, job) => {
      summary.total += 1;
      summary[job.status] = (summary[job.status] ?? 0) + 1;
      return summary;
    },
    { total: 0, queued: 0, running: 0, done: 0, error: 0, cancelled: 0 }
  );
}

export function createDemoQueue() {
  let queue = [];
  queue = reduceQueue(queue, { type: "enqueue", payload: { prompt: "a local study room with one agent console" } });
  const first = queue[0];
  queue = reduceQueue(queue, { type: "update", id: first.id, event: { type: "start" } });
  queue = reduceQueue(queue, { type: "update", id: first.id, event: { type: "progress", progress: 42 } });
  queue = reduceQueue(queue, { type: "enqueue", payload: { prompt: "windows workstation with rtx 5060 ti" } });
  return queue;
}

export function runDemo() {
  const queue = createDemoQueue();
  return {
    day: 34,
    title: "图片任务队列 UI",
    localOnly: true,
    queue,
    summary: summarizeQueue(queue),
  };
}
