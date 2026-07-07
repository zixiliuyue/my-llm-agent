/**
 * Day 20：自包含学习源码。
 *
 * 这个文件属于 day20-background-jobs，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
/**
 * Day 20：Background Jobs。
 *
 * 本文件是当天最小可运行核心逻辑，接近逐行写中文注释，方便新手顺着代码读。
 * 重要边界：这里不 import 其它 day，不调用真实模型，不执行远程命令或部署。
 */

// lesson 是当天的元信息，CLI、测试和 README 都可以围绕它理解本 day 在学什么。
// 导出常量：其它文件可以 import 这个值，适合放默认配置或元信息。
export const lesson = Object.freeze({
  // day 使用两位字符串，便于排序和在输出中展示。
  day: "20",
  // slug 是机器友好的英文短名，适合文件名、事件 source 和 URL 片段。
  slug: "background-jobs",
  // title 是给人看的中文标题，CLI 成功日志会打印它。
  title: "Background Jobs",
  concepts: [
    // concepts 是今天要理解的核心概念列表。
    "学习后台任务的 dry-run、执行日志和状态。",
    "默认不启动真实定时器。"
  ],
  artifacts: [
    // artifacts 是今天代码产出的最小能力或接口。
    "schedule dry-run",
    "job log",
    "status summary"
  ],
  // web 标记今天是否产出静态页面；false 表示只需要 CLI 和测试。
  web: false,
});

/**
 * 构造当天的 mock 输入。
 *
 * overrides 是给测试或 CLI 临时覆盖字段用的对象；例如传入 message 可以模拟用户输入。
 */
export function createDemoInput(overrides = {}) {
  // 返回对象就是本 day 的最小请求形状，字段都显式写出来方便学习。
  return {
    // requestId 模拟一次请求或一次 agent run 的唯一标识。
    requestId: "day20-demo",
    // actor 表示是谁触发了这次 demo；教学里固定为 learner。
    actor: 'learner',
    // message 是本次 demo 的输入文本；CLI 会用命令行参数覆盖它。
    message: "Background Jobs demo",
    // mode=mock 明确说明这里不会访问真实模型、文件系统或远程服务。
    mode: 'mock',
    // overrides 放最后，表示外部传入的同名字段优先生效。
    ...overrides,
  };
}

/**
 * 运行当天的核心流程。
 *
 * input 默认来自 createDemoInput；测试可以传自定义 input 验证流程是否稳定。
 */
export function runDemo(input = createDemoInput()) {
  // events 是教学版事件流，用数组按顺序描述今天的关键步骤。
  const events = [
  {
    // step 是事件顺序，帮助你按时间线理解流程。
    "step": 1,
    // name 是这一步模拟的 mini-openclaw 能力点。
    "name": "schedule dry-run",
    // status 表示这一步只是教学 mock，不执行真实外部副作用。
    "status": "ready"
  },
  {
    // step 是事件顺序，帮助你按时间线理解流程。
    "step": 2,
    // name 是这一步模拟的 mini-openclaw 能力点。
    "name": "job log",
    // status 表示这一步只是教学 mock，不执行真实外部副作用。
    "status": "mocked"
  },
  {
    // step 是事件顺序，帮助你按时间线理解流程。
    "step": 3,
    // name 是这一步模拟的 mini-openclaw 能力点。
    "name": "status summary",
    // status 表示这一步只是教学 mock，不执行真实外部副作用。
    "status": "mocked"
  }
].map((event) => ({
    // 展开原始事件字段，保留 step、name、status。
    ...event,
    // source 标注事件来自哪一天，方便未来聚合多个 agent run 时排查来源。
    source: "day20:background-jobs",
  }));

  // 返回统一结构，方便每一天用同一套测试方式验证。
  return {
    // ok=true 表示 demo 流程成功，没有触发校验错误。
    ok: true,
    // lesson 放进结果里，调用方无需再 import 元信息也能展示标题和概念。
    lesson,
    // input 回显本次输入，便于理解 overrides 是否生效。
    input,
    // events 是本 day 最重要的学习结果，模拟平台事件流。
    events,
    // summary 是给测试和人类快速判断结果的摘要。
    summary: {
      // eventCount 记录事件数量，测试会确认它大于 0。
      eventCount: events.length,
      // lastEvent 取最后一个事件名，用来快速知道流程走到哪里。
      lastEvent: events.at(-1)?.name,
      // safeMode=true 是安全边界：本 day 只 mock，不做真实副作用。
      safeMode: true,
    },
  };
}

/**
 * 校验 demo 是否满足当天的安全边界。
 *
 * result 是 runDemo 返回的对象；函数返回 {ok:false,error} 时 CLI 会退出非 0。
 */
export function validateDemo(result) {
  // 没有结果或 ok 不是 true，说明核心流程没有成功执行。
  if (!result || result.ok !== true) return { ok: false, error: 'demo 没有成功执行' };
  // events 必须是非空数组，因为本项目用事件流教学 agent 平台行为。
  if (!Array.isArray(result.events) || result.events.length === 0) return { ok: false, error: 'demo 没有产生事件' };
  // safeMode 必须保持 true，防止教学 demo 意外执行真实外部动作。
  if (result.summary.safeMode !== true) return { ok: false, error: 'demo 必须保持 safeMode' };
  // 所有检查通过，返回 ok=true 给 CLI 和测试使用。
  return { ok: true };
}
