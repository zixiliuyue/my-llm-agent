/**
 * Day 74：结构化输出契约与自动修复。
 *
 * 学习目标：LLM 应用最基础的可靠性手段,就是让模型输出可被机器校验的结构(JSON),
 * 而不是自由文本。这一日实现三件事:
 *   1. 一个轻量 JSON Schema 校验器(不引第三方库,只覆盖教学够用的规则);
 *   2. function-calling 参数校验(工具调用前先验参数,不合法直接拒绝调用);
 *   3. 校验失败 -> 生成“修复提示” -> 重新让模型产出 -> 再校验的自动修复回路。
 *
 * 边界:模型只负责“产出内容”;是否合法、错在哪、要不要重试、重试几次
 * 这些确定性逻辑必须由代码判断,绝不能让模型自己声称“我合法了”。
 */

/**
 * 轻量 JSON Schema 校验器。
 * 支持:type(string/number/boolean/object/array)、required、enum、minimum/maximum、
 * minLength、properties、items。返回结构化错误列表,每条指明字段路径和原因。
 */
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function validateSchema(value, schema, path = "$") {
  // 定义常量：收集所有校验错误,一次性返回,便于生成修复提示。
  const errors = [];

  // 条件判断：先校验类型,类型不对后面的规则没有意义。
  if (schema.type && !matchType(value, schema.type)) {
    errors.push({ path, message: `期望类型 ${schema.type},实际 ${describeType(value)}` });
    // 返回结果：类型错误时提前返回,避免对错误类型继续套用子规则。
    return { ok: false, errors };
  }

  // 条件判断：字符串的枚举和最小长度校验。
  if (schema.type === "string") {
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push({ path, message: `必须是枚举值之一: ${schema.enum.join("/")}` });
    }
    if (typeof schema.minLength === "number" && value.length < schema.minLength) {
      errors.push({ path, message: `长度至少 ${schema.minLength}` });
    }
  }

  // 条件判断：数字的上下界校验。
  if (schema.type === "number") {
    if (typeof schema.minimum === "number" && value < schema.minimum) {
      errors.push({ path, message: `不能小于 ${schema.minimum}` });
    }
    if (typeof schema.maximum === "number" && value > schema.maximum) {
      errors.push({ path, message: `不能大于 ${schema.maximum}` });
    }
  }

  // 条件判断：对象要校验 required 字段和每个属性的子 schema。
  if (schema.type === "object") {
    // 循环：required 里声明的字段必须存在。
    for (const key of schema.required || []) {
      if (value[key] === undefined) {
        errors.push({ path: `${path}.${key}`, message: "必填字段缺失" });
      }
    }
    // 循环：对已声明的属性递归校验。
    for (const [key, subSchema] of Object.entries(schema.properties || {})) {
      if (value[key] !== undefined) {
        // 递归调用：子字段的错误会带上完整路径,方便定位。
        const sub = validateSchema(value[key], subSchema, `${path}.${key}`);
        errors.push(...sub.errors);
      }
    }
  }

  // 条件判断：数组要逐元素套用 items schema。
  if (schema.type === "array" && schema.items) {
    value.forEach((item, index) => {
      // 递归调用：数组元素错误带上下标路径。
      const sub = validateSchema(item, schema.items, `${path}[${index}]`);
      errors.push(...sub.errors);
    });
  }

  // 返回结果：ok 为真表示完全符合契约。
  return { ok: errors.length === 0, errors };
}

/** 判断值是否符合 schema 声明的基础类型。 */
// 普通函数：把一段可复用逻辑命名,降低主流程阅读成本。
function matchType(value, type) {
  // 条件判断：数组要单独判断,因为 typeof [] 是 "object"。
  if (type === "array") return Array.isArray(value);
  // 条件判断：对象要排除 null 和数组。
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "number") return typeof value === "number" && !Number.isNaN(value);
  if (type === "string") return typeof value === "string";
  if (type === "boolean") return typeof value === "boolean";
  // 返回结果：未知类型一律不匹配,防止漏网。
  return false;
}

/** 给出值的实际类型描述,用于错误信息。 */
// 普通函数：把一段可复用逻辑命名,降低主流程阅读成本。
function describeType(value) {
  // 条件判断：数组和 null 要特判,否则 typeof 会误导。
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  // 返回结果：其余用 typeof。
  return typeof value;
}

/**
 * function-calling 参数校验:工具调用前,先用工具声明的参数 schema 校验模型给的入参。
 * 不合法就拒绝调用并返回错误,这样错误的工具调用不会真的执行。
 */
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function validateToolCall({ tool, args }) {
  // 条件判断：未知工具直接拒绝,避免模型臆造工具名。
  if (!tool || !tool.parameters) {
    // 返回结果：缺少工具声明视为不可调用。
    return { ok: false, errors: [{ path: "$", message: "工具未声明 parameters schema" }] };
  }
  // 定义常量：复用通用 schema 校验器校验入参。
  const result = validateSchema(args, tool.parameters);
  // 返回结果：callable 明确告诉调用方能不能真的执行这次工具调用。
  return { ok: result.ok, callable: result.ok, errors: result.errors };
}

/** 把校验错误翻译成给模型的“修复提示”,这是自动修复回路的关键一环。 */
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function buildRepairPrompt(errors) {
  // 定义常量：把每条错误拼成人类和模型都能懂的一行。
  const lines = errors.map((e) => `- ${e.path}: ${e.message}`);
  // 返回结果：显式要求模型只修复这些字段并重新输出合法 JSON。
  return `你上一次输出不符合契约,请仅修复以下问题后重新输出合法 JSON:\n${lines.join("\n")}`;
}

/**
 * 自动修复回路:校验失败 -> 生成修复提示 -> 让 producer 重新产出 -> 再校验,
 * 最多重试 maxRetries 次。producer 是一个 (repairPrompt|null) => value 的函数,
 * 真实系统里就是“带着修复提示再调一次 LLM”。
 */
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function produceWithRepair({ schema, producer, maxRetries = 2 }) {
  // 定义变量：记录每一轮的尝试,便于审计模型是怎么一步步修好的。
  const attempts = [];
  // 定义变量：初次产出不带修复提示。
  let repairPrompt = null;

  // 循环：初次 + 最多 maxRetries 次修复。
  for (let round = 0; round <= maxRetries; round += 1) {
    // 定义常量：让 producer 产出一次(带上一次的修复提示)。
    const value = producer(repairPrompt);
    // 定义常量：立刻校验产物是否符合契约。
    const result = validateSchema(value, schema);
    // 记录本轮尝试的产物和校验结果。
    attempts.push({ round, value, ok: result.ok, errors: result.errors });

    // 条件判断：一旦合法就返回,不再浪费重试次数。
    if (result.ok) {
      // 返回结果：成功产物 + 完整尝试轨迹。
      return { ok: true, value, attempts, rounds: round + 1 };
    }
    // 定义变量：不合法就根据错误生成下一轮的修复提示。
    repairPrompt = buildRepairPrompt(result.errors);
  }

  // 返回结果：重试用尽仍不合法,交给上层决定是拒绝还是人工兜底。
  return { ok: false, value: null, attempts, rounds: maxRetries + 1 };
}

/** CLI demo：一个总是先输出坏 JSON、拿到修复提示后才输出合法 JSON 的模型。 */
// 普通函数：把一段可复用逻辑命名,降低主流程阅读成本。
export function runDemo() {
  // 定义常量：期望模型输出的结构契约——一份事故摘要。
  const schema = {
    type: "object",
    required: ["severity", "summary", "impactedServices"],
    properties: {
      severity: { type: "string", enum: ["P0", "P1", "P2", "P3"] },
      summary: { type: "string", minLength: 5 },
      impactedServices: { type: "array", items: { type: "string" } },
    },
  };

  // 定义常量：工具声明,用于演示 function-calling 参数校验。
  const queryMetricsTool = {
    name: "query_metrics",
    parameters: {
      type: "object",
      required: ["metric", "windowMinutes"],
      properties: {
        metric: { type: "string" },
        windowMinutes: { type: "number", minimum: 1, maximum: 1440 },
      },
    },
  };

  // 定义变量：模拟模型第一次给坏数据(severity 非法枚举、缺 impactedServices),
  // 第二次拿到修复提示后才给合法数据。
  let called = 0;
  const producer = (repairPrompt) => {
    called += 1;
    // 条件判断：第一次(没有修复提示)故意产出不合法结构。
    if (!repairPrompt) {
      return { severity: "严重", summary: "p95" };
    }
    // 返回结果：收到修复提示后产出合法结构。
    return { severity: "P1", summary: "p95 延迟升高,已定位慢查询", impactedServices: ["orders", "payment"] };
  };

  // 定义常量：跑自动修复回路。
  const repaired = produceWithRepair({ schema, producer });

  // 定义常量：演示两次工具调用参数校验——一次非法(超出上界),一次合法。
  const badCall = validateToolCall({ tool: queryMetricsTool, args: { metric: "p95", windowMinutes: 5000 } });
  const goodCall = validateToolCall({ tool: queryMetricsTool, args: { metric: "p95", windowMinutes: 60 } });

  // 返回结果：调用方拿到修复轨迹和工具校验结论。
  return {
    day: 74,
    title: "structured-output-contract",
    localOnly: true,
    repaired,
    toolCalls: { badCall, goodCall },
    notes: [
      "结构化输出让模型产物可被机器校验,而不是猜自由文本",
      "校验失败要把错误翻译成修复提示,让模型定向重试",
      "工具调用前必须先验参数,非法入参不能真的执行",
    ],
  };
}
