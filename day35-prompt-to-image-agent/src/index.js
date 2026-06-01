/**
 * Day 35：自包含学习源码。
 *
 * 这个文件属于 day35-prompt-to-image-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：让文本模型只优化图片 prompt，不直接生成图片或选择远程服务。
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const STYLE_PRESETS = {
  study: "clean educational screenshot style, readable interface, natural lighting",
  product: "precise product render, sharp edges, realistic material, uncluttered background",
  storyboard: "cinematic storyboard frame, clear subject motion, balanced composition",
};

// 确定性 prompt 优化器；真实 Ollama 可替换为同结构输出，但不改变安全边界。
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function optimizeImagePrompt({ userText, style = "study", negative = "" }) {
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!userText || typeof userText !== "string") {
    // 抛出错误：让调用方知道当前流程不能继续。
    throw new Error("userText is required");
  }
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const styleText = STYLE_PRESETS[style] ?? STYLE_PRESETS.study;
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const positivePrompt = [
    userText.trim(),
    styleText,
    "local generation, high detail, coherent layout",
  ].join(", ");
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const negativePrompt = [
    "cloud logo, watermark, unreadable text, distorted hands",
    negative.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    positivePrompt,
    negativePrompt,
    handoff: {
      provider: "comfy:image",
      workflowProfile: "sdxl-base",
      localOnly: true,
    },
  };
}

// Ollama 只用于生成结构化 prompt 草稿，图片仍交给 ComfyUI。
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function buildOllamaPromptRequest({ userText, model = process.env.OLLAMA_MODEL ?? "qwen2.5:7b" }) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    model,
    stream: false,
    messages: [
      {
        role: "system",
        content: "你只负责把用户需求改写成适合本地 ComfyUI 的中文/英文图片 prompt，不要声称自己生成图片。",
      },
      {
        role: "user",
        content: userText,
      },
    ],
    format: "json",
  };
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function parseOllamaPromptResponse(response, fallbackInput) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const content = response?.message?.content;
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!content) {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return optimizeImagePrompt(fallbackInput);
  }
  // try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
  try {
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const parsed = JSON.parse(content);
    // 返回结果：调用方会拿到这个值继续后续流程。
    return {
      positivePrompt: parsed.positivePrompt ?? parsed.prompt ?? optimizeImagePrompt(fallbackInput).positivePrompt,
      negativePrompt: parsed.negativePrompt ?? optimizeImagePrompt(fallbackInput).negativePrompt,
      handoff: {
        provider: "comfy:image",
        workflowProfile: parsed.workflowProfile ?? "sdxl-base",
        localOnly: true,
      },
    };
  } catch {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return optimizeImagePrompt(fallbackInput);
  }
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo(message = "给 day34 队列页面生成一张简洁封面图") {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const optimized = optimizeImagePrompt({ userText: message, style: "study" });
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 35,
    title: "Prompt 到图片 Agent",
    roleBoundary: "Ollama 只优化 prompt，ComfyUI 负责图片生成。",
    optimized,
    ollamaRequest: buildOllamaPromptRequest({ userText: message }),
  };
}
