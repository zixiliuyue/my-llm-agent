/**
 * Day 23：Device Node Pairing
 *
 * 这个文件是当天的核心学习代码。它刻意保持小而完整：
 * 1. 不依赖其它 day 的源码，方便学习时随意修改。
 * 2. 用 mock 数据演示 mini-openclaw 的一个能力点。
 * 3. 在关键流程旁边写中文注释，帮助理解设计意图。
 */

export const lesson = Object.freeze({
  day: "23",
  slug: "device-node-pairing",
  title: "Device Node Pairing",
  concepts: [
  "学习设备节点配对码和 allowlist。",
  "只在内存中演示配对，不写系统配置。"
],
  artifacts: [
  "pairing code",
  "allowlist",
  "node status"
],
  web: false,
});

/**
 * 构造当天的 mock 输入。
 *
 * 真实 OpenClaw 会从 Gateway、消息通道或 workspace 读取输入。
 * 教学版先用固定对象表达输入形状，避免引入额外系统依赖。
 */
export function createDemoInput(overrides = {}) {
  return {
    requestId: "day23-demo",
    actor: 'learner',
    message: "Device Node Pairing demo",
    mode: 'mock',
    ...overrides,
  };
}

/**
 * 运行当天的核心流程。
 *
 * 返回值统一包含 ok、lesson、input、events 和 summary，便于每一天
 * 用同一种方式写测试，也便于最终 day30 对齐平台事件模型。
 */
export function runDemo(input = createDemoInput()) {
  const events = [
  {
    "step": 1,
    "name": "pairing code",
    "status": "ready"
  },
  {
    "step": 2,
    "name": "allowlist",
    "status": "mocked"
  },
  {
    "step": 3,
    "name": "node status",
    "status": "mocked"
  }
].map((event) => ({
    ...event,
    // 所有事件都显式标注来源，模拟 Gateway event stream 的最小形态。
    source: "day23:device-node-pairing",
  }));
  return {
    ok: true,
    lesson,
    input,
    events,
    summary: {
      eventCount: events.length,
      lastEvent: events.at(-1)?.name,
      safeMode: true,
    },
  };
}

/**
 * 校验 demo 是否满足当天的安全边界。
 *
 * 这里不执行真实模型、远程命令或部署动作，只检查 mock 流程是否
 * 按预期产生事件，作为每一天最小测试的共同基础。
 */
export function validateDemo(result) {
  if (!result || result.ok !== true) return { ok: false, error: 'demo 没有成功执行' };
  if (!Array.isArray(result.events) || result.events.length === 0) return { ok: false, error: 'demo 没有产生事件' };
  if (result.summary.safeMode !== true) return { ok: false, error: 'demo 必须保持 safeMode' };
  return { ok: true };
}
