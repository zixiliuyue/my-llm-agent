export class HandoffError extends Error {
  constructor(message) {
    super(message);
    this.name = 'HandoffError';
  }
}

function stripFence(text) {
  const trimmed = String(text || '').trim();
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return match ? match[1].trim() : trimmed;
}

export function extractJson(text) {
  const source = stripFence(text);
  const start = source.indexOf('{');
  if (start < 0) {
    throw new HandoffError('没有找到 JSON 对象');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(source.slice(start, index + 1));
      }
    }
  }
  throw new HandoffError('JSON 对象不完整');
}

export function parsePlan(text) {
  const value = extractJson(text);
  if (value.type !== 'plan' || !Array.isArray(value.steps) || value.steps.length === 0) {
    throw new HandoffError('planner 必须输出 {type:"plan", steps:[...]}');
  }
  const steps = value.steps.map((step, index) => {
    if (!step || typeof step !== 'object') {
      throw new HandoffError(`plan.steps[${index}] 必须是对象`);
    }
    if (typeof step.tool !== 'string' || !step.tool.trim()) {
      throw new HandoffError(`plan.steps[${index}] 缺少 tool`);
    }
    return {
      id: typeof step.id === 'string' && step.id.trim() ? step.id.trim() : `step-${index + 1}`,
      reason: typeof step.reason === 'string' ? step.reason : '',
      tool: step.tool.trim(),
      input: step.input && typeof step.input === 'object' && !Array.isArray(step.input) ? step.input : {},
    };
  });
  return { type: 'plan', steps };
}

export function parseCritique(text) {
  const value = extractJson(text);
  if (value.type !== 'critique') {
    throw new HandoffError('critic 必须输出 {type:"critique", ok:boolean, issues:[]}');
  }
  return {
    type: 'critique',
    ok: value.ok === true,
    issues: Array.isArray(value.issues) ? value.issues.map(String) : [],
  };
}

export function parseFinal(text) {
  const value = extractJson(text);
  if (value.type !== 'final' || typeof value.answer !== 'string' || !value.answer.trim()) {
    throw new HandoffError('writer 必须输出 {type:"final", answer:"..."}');
  }
  return {
    type: 'final',
    answer: value.answer.trim(),
  };
}

