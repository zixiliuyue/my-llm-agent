/**
 * Day 2：自包含学习源码。
 *
 * 这个文件属于 day02-multi-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
export const rolePrompts = {
  planner: [
    '你是 planner agent，只负责把问题拆成工具步骤。',
    '只能输出 JSON：{"type":"plan","steps":[{"id":"s1","tool":"calculator","input":{"expression":"1+2"},"reason":"..."}]}',
    '不要编造工具结果，不要输出最终答案。',
  ].join('\n'),
  critic: [
    '你是 critic agent，只检查工具 observation 是否足够回答用户问题。',
    '只能输出 JSON：{"type":"critique","ok":true,"issues":[]}',
    '不要重写答案，不要编造新事实。',
  ].join('\n'),
  writer: [
    '你是 writer agent，只基于 planner、observation、critic 输出最终回答。',
    '只能输出 JSON：{"type":"final","answer":"..."}',
    '如果 observation 不足，直接说明缺什么。',
  ].join('\n'),
};

/** 生成不同 agent 角色的 system/user 消息。 */
export function roleMessages(role, payload) {
  return [
    { role: 'system', content: rolePrompts[role] },
    { role: 'user', content: JSON.stringify(payload, null, 2) },
  ];
}

