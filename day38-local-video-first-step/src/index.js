/**
 * Day 38：自包含学习源码。
 *
 * 这个文件属于 day38-local-video-first-step，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：先从图生短视频计划开始，而不是直接上大规模视频模型。
// 教学：导出常量：其它文件可以 import 这个值，适合放默认配置或元信息。
export const VIDEO_FIRST_STEP_PROFILE = {
  id: "svd-image-to-video",
  family: "Stable Video Diffusion",
  task: "image-to-video",
  localOnly: true,
  minVramGb: 12,
  recommendedVramGb: 16,
  defaultFrames: 14,
  defaultSize: "576x1024",
  note: "作为短视频第一步评估，先用单张本地图片生成短片段。",
};

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function parseSize(size) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const match = /^(\d+)x(\d+)$/.exec(size);
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!match) {
    // 教学：抛出错误：让调用方知道当前流程不能继续。
    throw new Error(`invalid video size: ${size}`);
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return { width: Number(match[1]), height: Number(match[2]) };
}

// 生成短视频计划，不执行真实推理。
// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function buildImageToVideoPlan({
  sourceImage,
  // 教学：更新状态：这里会改变前面定义的变量或对象字段。
  frames = VIDEO_FIRST_STEP_PROFILE.defaultFrames,
  // 教学：更新状态：这里会改变前面定义的变量或对象字段。
  size = VIDEO_FIRST_STEP_PROFILE.defaultSize,
  // 教学：更新状态：这里会改变前面定义的变量或对象字段。
  motion = "low",
}) {
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!sourceImage || /^https?:\/\//i.test(sourceImage)) {
    // 教学：抛出错误：让调用方知道当前流程不能继续。
    throw new Error("sourceImage must be a local image path");
  }
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const parsedSize = parseSize(size);
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    provider: "local:video",
    profile: VIDEO_FIRST_STEP_PROFILE.id,
    sourceImage,
    frames,
    size: parsedSize,
    motion,
    localOnly: true,
    estimatedLoad: frames > 16 ? "high" : "medium",
  };
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function recommendVideoFirstStep({ platform = "darwin", gpuVendor = "apple", vramGb = 0 } = {}) {
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (platform === "win32" && gpuVendor === "nvidia" && vramGb >= 16) {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return {
      canTry: true,
      profile: VIDEO_FIRST_STEP_PROFILE.id,
      note: "Windows + RTX 5060 Ti 16G 可以从 SVD 图生短视频开始，但先控制帧数和分辨率。",
    };
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    canTry: false,
    profile: VIDEO_FIRST_STEP_PROFILE.id,
    note: "Mac 或未知 GPU 先保留 plan/mock，真实视频推理建议转到 NVIDIA Windows。",
  };
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo() {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 38,
    title: "本地短视频第一步",
    profile: VIDEO_FIRST_STEP_PROFILE,
    plan: buildImageToVideoPlan({ sourceImage: "outputs/day36-agent-cover.png" }),
    windows5060Ti: recommendVideoFirstStep({ platform: "win32", gpuVendor: "nvidia", vramGb: 16 }),
  };
}
