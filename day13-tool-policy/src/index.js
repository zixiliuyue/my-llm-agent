/**
 * Day 13：自包含学习源码。
 *
 * 这个文件属于 day13-tool-policy，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
/**
 * Day 13：Tool Policy。
 *
 * 本文件是当天最小可运行核心逻辑，接近逐行写中文注释，方便新手顺着代码读。
 * 重要边界：这里不 import 其它 day，不调用真实模型，不执行远程命令或部署。
 */

// lesson 是当天的元信息，CLI、测试和 README 都可以围绕它理解本 day 在学什么。
// 导出常量：其它文件可以 import 这个值，适合放默认配置或元信息。
export const lesson = Object.freeze({
  // day 使用两位字符串，便于排序和在输出中展示。
  day: "13",
  // slug 是机器友好的英文短名，适合文件名、事件 source 和 URL 片段。
  slug: "tool-policy",
  // title 是给人看的中文标题，CLI 成功日志会打印它。
  title: "Tool Policy",
  concepts: [
    // concepts 是今天要理解的核心概念列表。
    "学习工具风险分级和审批边界。",
    "read-only 直接执行，local-write/remote 默认等待确认。"
  ],
  artifacts: [
    // artifacts 是今天代码产出的最小能力或接口。
    "read-only",
    "local-write approval",
    "remote blocked",
    "tool risk classification",
    "approval chain"
  ],
  // web 标记今天是否产出静态页面；false 表示只需要 CLI 和测试。
  web: false,
});

/**
 * 工具风险等级定义。
 *
 * 这是工具策略的核心配置，每个工具类型对应不同的安全级别和处理方式。
 * 导出常量：其它函数可以引用这个配置，保持定义唯一。
 */
export const TOOL_RISK_LEVELS = Object.freeze({
  // READ_ONLY：只读操作，无副作用，可直接执行
  READ_ONLY: Object.freeze({
    level: 'low',
    autoApprove: true,
    description: '只读工具，无副作用，可直接执行'
  }),
  // LOCAL_WRITE：本地文件写入，有副作用，需要审批
  LOCAL_WRITE: Object.freeze({
    level: 'medium',
    autoApprove: false,
    description: '本地写入工具，可能修改文件，需要审批'
  }),
  // REMOTE：远程命令或网络操作，高风险，默认阻止
  REMOTE: Object.freeze({
    level: 'high',
    autoApprove: false,
    blocked: true,
    description: '远程执行工具，高风险，默认阻止'
  })
});

/**
 * 根据工具名称判断工具类型和风险等级。
 *
 * toolName 是要判断的工具名称；返回对应的风险等级配置。
 * 导出函数：这是当天核心能力之一，提供给测试和 CLI 使用。
 */
export function classifyToolRisk(toolName) {
  // 参数校验：确保输入是字符串，防止类型错误
  if (typeof toolName !== 'string') {
    throw new Error('工具名称必须是字符串');
  }

  const name = toolName.toLowerCase();

  // 先判断高风险的远程工具，避免关键词冲突
  if (name.includes('ssh') || name.includes('scp') ||
      name.includes('curl') || name.includes('wget') ||
      name.includes('remote') || name.includes('exec') ||
      name.includes('http')) {
    return TOOL_RISK_LEVELS.REMOTE;
  }

  // 本地写入工具：修改本地文件
  if (name.includes('write') || name.includes('save') ||
      name.includes('delete') || name.includes('remove') ||
      name.includes('rm') || name.includes('mv') ||
      name.includes('create') || name.includes('mkdir')) {
    return TOOL_RISK_LEVELS.LOCAL_WRITE;
  }

  // 只读工具：不修改任何状态
  if (name.includes('read') || name.includes('list') || 
      name.includes('get') || name.includes('search') ||
      name.includes('stat') || name.includes('cat') ||
      name.includes('ls') || name.includes('find')) {
    return TOOL_RISK_LEVELS.READ_ONLY;
  }

  // 默认按中等风险处理，需要审批
  return {
    level: 'medium',
    autoApprove: false,
    description: '未知工具，默认需要审批'
  };
}

/**
 * 模拟审批链检查。
 *
 * toolName 是工具名称，approvalContext 是审批上下文；返回审批结果。
 * 导出函数：这是当天核心能力之一，提供给测试和 CLI 使用。
 */
export function checkApproval(toolName, approvalContext = {}) {
  const risk = classifyToolRisk(toolName);
  
  // 高风险工具直接阻止
  if (risk.blocked) {
    return {
      approved: false,
      blocked: true,
      reason: '高风险工具默认阻止',
      riskLevel: risk.level,
      toolName
    };
  }

  // 自动审批的工具直接通过
  if (risk.autoApprove) {
    return {
      approved: true,
      autoApproved: true,
      reason: risk.description,
      riskLevel: risk.level,
      toolName
    };
  }

  // 需要人工审批的工具
  return {
    approved: false,
    pendingApproval: true,
    reason: '需要用户确认',
    riskLevel: risk.level,
    toolName,
    approver: approvalContext.actor || 'unknown'
  };
}

/**
 * 构造当天的 mock 输入。
 *
 * overrides 是给测试或 CLI 临时覆盖字段用的对象；例如传入 message 可以模拟用户输入。
 */
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createDemoInput(overrides = {}) {
  // 返回对象就是本 day 的最小请求形状，字段都显式写出来方便学习。
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    // requestId 模拟一次请求或一次 agent run 的唯一标识。
    requestId: "day13-demo",
    // actor 表示是谁触发了这次 demo；教学里固定为 learner。
    actor: "learner",
    // message 是本次 demo 的输入文本；CLI 会用命令行参数覆盖它。
    message: "Tool Policy demo",
    // mode=mock 明确说明这里不会访问真实模型、文件系统或远程服务。
    mode: "mock",
    // tools 模拟用户要调用的工具列表
    tools: [
      { name: "read_file", args: { path: "/tmp/test.txt" } },
      { name: "write_file", args: { path: "/tmp/test.txt", content: "hello" } },
      { name: "ssh_exec", args: { host: "remote-server", cmd: "reboot" } }
    ],
    // overrides 放最后，表示外部传入的同名字段优先生效。
    ...overrides,
  };
}

/**
 * 运行当天的核心流程。
 *
 * input 默认来自 createDemoInput；测试可以传自定义 input 验证流程是否稳定。
 */
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo(input = createDemoInput()) {
  // 对每个工具进行风险评估和审批检查
  const toolResults = input.tools?.map((tool, index) => {
    const risk = classifyToolRisk(tool.name);
    const approval = checkApproval(tool.name, input);
    return {
      step: index + 1,
      name: tool.name,
      riskLevel: risk.level,
      approved: approval.approved,
      blocked: approval.blocked || false,
      pendingApproval: approval.pendingApproval || false,
      reason: approval.reason,
      status: approval.approved ? "ready" : (approval.blocked ? "blocked" : "pending")
    };
  }) || [];
  console.log('toolResults toolResults:', toolResults);
  // events 是教学版事件流，用数组按顺序描述今天的关键步骤。
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const events = toolResults.map(result => ({
    step: result.step,
    name: `${result.name} (${result.riskLevel} risk)`,
    status: result.status,
    approved: result.approved,
    blocked: result.blocked,
    pendingApproval: result.pendingApproval,
    reason: result.reason,
    source: "day13:tool-policy",
  }));

  // 统计审批结果
  const approvedCount = toolResults.filter(r => r.approved).length;
  const blockedCount = toolResults.filter(r => r.blocked).length;
  const pendingCount = toolResults.filter(r => r.pendingApproval).length;

  // 返回统一结构，方便每一天用同一套测试方式验证。
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    // ok=true 表示 demo 流程成功，没有触发校验错误。
    ok: true,
    // lesson 放进结果里，调用方无需再 import 元信息也能展示标题和概念。
    lesson,
    // input 回显本次输入，便于理解 overrides 是否生效。
    input,
    // events 是本 day 最重要的学习结果，模拟平台事件流。
    events,
    // toolResults 保存每个工具的详细评估结果
    toolResults,
    // summary 是给测试和人类快速判断结果的摘要。
    summary: {
      // eventCount 记录事件数量，测试会确认它大于 0。
      eventCount: events.length,
      // lastEvent 取最后一个事件名，用来快速知道流程走到哪里。
      lastEvent: events.at(-1)?.name,
      // safeMode=true 是安全边界：本 day 只 mock，不做真实副作用。
      safeMode: true,
      // 统计信息
      approvedCount,
      blockedCount,
      pendingCount,
      totalTools: toolResults.length,
    },
  };
}

/**
 * 校验 demo 是否满足当天的安全边界。
 *
 * result 是 runDemo 返回的对象；函数返回 {ok:false,error} 时 CLI 会退出非 0。
 */
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function validateDemo(result) {
  // 没有结果或 ok 不是 true，说明核心流程没有成功执行。
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!result || result.ok !== true) return { ok: false, error: 'demo 没有成功执行' };
  // events 必须是非空数组，因为本项目用事件流教学 agent 平台行为。
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!Array.isArray(result.events) || result.events.length === 0) return { ok: false, error: 'demo 没有产生事件' };
  // safeMode 必须保持 true，防止教学 demo 意外执行真实外部动作。
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (result.summary.safeMode !== true) return { ok: false, error: 'demo 必须保持 safeMode' };
  // 必须包含工具评估结果
  if (!result.toolResults) return { ok: false, error: 'demo 缺少工具评估结果' };
  // 统计信息必须正确
  if (result.summary.approvedCount + result.summary.blockedCount + result.summary.pendingCount !== result.summary.totalTools) {
    return { ok: false, error: '统计信息不一致' };
  }
  // 所有检查通过，返回 ok=true 给 CLI 和测试使用。
  // 返回结果：调用方会拿到这个值继续后续流程。
  return { ok: true };
}
