// 学习目标：先从图生短视频计划开始，而不是直接上大规模视频模型。
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

export function parseSize(size) {
  const match = /^(\d+)x(\d+)$/.exec(size);
  if (!match) {
    throw new Error(`invalid video size: ${size}`);
  }
  return { width: Number(match[1]), height: Number(match[2]) };
}

// 生成短视频计划，不执行真实推理。
export function buildImageToVideoPlan({
  sourceImage,
  frames = VIDEO_FIRST_STEP_PROFILE.defaultFrames,
  size = VIDEO_FIRST_STEP_PROFILE.defaultSize,
  motion = "low",
}) {
  if (!sourceImage || /^https?:\/\//i.test(sourceImage)) {
    throw new Error("sourceImage must be a local image path");
  }
  const parsedSize = parseSize(size);
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

export function recommendVideoFirstStep({ platform = "darwin", gpuVendor = "apple", vramGb = 0 } = {}) {
  if (platform === "win32" && gpuVendor === "nvidia" && vramGb >= 16) {
    return {
      canTry: true,
      profile: VIDEO_FIRST_STEP_PROFILE.id,
      note: "Windows + RTX 5060 Ti 16G 可以从 SVD 图生短视频开始，但先控制帧数和分辨率。",
    };
  }
  return {
    canTry: false,
    profile: VIDEO_FIRST_STEP_PROFILE.id,
    note: "Mac 或未知 GPU 先保留 plan/mock，真实视频推理建议转到 NVIDIA Windows。",
  };
}

export function runDemo() {
  return {
    day: 38,
    title: "本地短视频第一步",
    profile: VIDEO_FIRST_STEP_PROFILE,
    plan: buildImageToVideoPlan({ sourceImage: "outputs/day36-agent-cover.png" }),
    windows5060Ti: recommendVideoFirstStep({ platform: "win32", gpuVendor: "nvidia", vramGb: 16 }),
  };
}
