// 学习目标：让文本模型只优化图片 prompt，不直接生成图片或选择远程服务。
const STYLE_PRESETS = {
  study: "clean educational screenshot style, readable interface, natural lighting",
  product: "precise product render, sharp edges, realistic material, uncluttered background",
  storyboard: "cinematic storyboard frame, clear subject motion, balanced composition",
};

// 确定性 prompt 优化器；真实 Ollama 可替换为同结构输出，但不改变安全边界。
export function optimizeImagePrompt({ userText, style = "study", negative = "" }) {
  if (!userText || typeof userText !== "string") {
    throw new Error("userText is required");
  }
  const styleText = STYLE_PRESETS[style] ?? STYLE_PRESETS.study;
  const positivePrompt = [
    userText.trim(),
    styleText,
    "local generation, high detail, coherent layout",
  ].join(", ");
  const negativePrompt = [
    "cloud logo, watermark, unreadable text, distorted hands",
    negative.trim(),
  ]
    .filter(Boolean)
    .join(", ");

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
export function buildOllamaPromptRequest({ userText, model = process.env.OLLAMA_MODEL ?? "qwen2.5:7b" }) {
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

export function parseOllamaPromptResponse(response, fallbackInput) {
  const content = response?.message?.content;
  if (!content) {
    return optimizeImagePrompt(fallbackInput);
  }
  try {
    const parsed = JSON.parse(content);
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
    return optimizeImagePrompt(fallbackInput);
  }
}

export function runDemo(message = "给 day34 队列页面生成一张简洁封面图") {
  const optimized = optimizeImagePrompt({ userText: message, style: "study" });
  return {
    day: 35,
    title: "Prompt 到图片 Agent",
    roleBoundary: "Ollama 只优化 prompt，ComfyUI 负责图片生成。",
    optimized,
    ollamaRequest: buildOllamaPromptRequest({ userText: message }),
  };
}
