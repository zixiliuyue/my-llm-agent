/**
 * Day 39：自包含学习源码。
 *
 * 这个文件属于 day39-framepack-video-local，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：把 FramePack 作为 Windows/NVIDIA 本地视频实验 profile，而不是默认云服务。
// 导出常量：其它文件可以 import 这个值，适合放默认配置或元信息。
export const FRAMEPACK_PROFILE = {
  id: "framepack-local",
  task: "image-to-video",
  localOnly: true,
  preferredPlatform: "win32",
  supportedGpuVendor: "nvidia",
  minVramGb: 8,
  recommendedVramGb: 16,
  endpoint: "http://127.0.0.1:7860",
  note: "适合 RTX 5060 Ti 16G 这类 Windows NVIDIA 机器做短视频实验。",
};

function hasNvidiaName(gpuName = "") {
  return /nvidia|rtx|geforce/i.test(gpuName);
}

export function evaluateFramePackReadiness({
  // 更新状态：这里会改变前面定义的变量或对象字段。
  platform = process.platform,
  // 更新状态：这里会改变前面定义的变量或对象字段。
  gpuName = "",
  // 更新状态：这里会改变前面定义的变量或对象字段。
  vramGb = 0,
  // 更新状态：这里会改变前面定义的变量或对象字段。
  memoryGb = 0,
} = {}) {
  const issues = [];
  if (platform !== "win32" && platform !== "linux") {
    issues.push("FramePack 本地实验优先 Windows/Linux，Mac 侧建议只保留 plan。");
  }
  if (!hasNvidiaName(gpuName)) {
    issues.push("需要 NVIDIA GPU。");
  }
  if (vramGb < FRAMEPACK_PROFILE.minVramGb) {
    issues.push(`显存至少建议 ${FRAMEPACK_PROFILE.minVramGb}G。`);
  }
  if (memoryGb > 0 && memoryGb < 32) {
    issues.push("系统内存建议 32G 或以上。");
  }

  return {
    ready: issues.length === 0,
    profile: FRAMEPACK_PROFILE,
    issues,
    recommendation:
      issues.length === 0
        ? "可以在 Windows + RTX 5060 Ti 16G 上尝试 FramePack 短视频实验。"
        : "先用 mock/plan 跑通代码，再补齐硬件和本地服务。",
  };
}

export function buildFramePackJob({
  sourceImage,
  prompt,
  // 更新状态：这里会改变前面定义的变量或对象字段。
  seconds = 4,
  // 更新状态：这里会改变前面定义的变量或对象字段。
  endpoint = process.env.FRAMEPACK_HOST ?? FRAMEPACK_PROFILE.endpoint,
}) {
  if (!sourceImage || /^https?:\/\//i.test(sourceImage)) {
    throw new Error("sourceImage must be a local image path");
  }
  if (!prompt) {
    throw new Error("prompt is required");
  }
  const url = new URL(endpoint);
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname)) {
    throw new Error("FramePack endpoint must be local");
  }
  return {
    provider: "framepack:video",
    endpoint: url.origin,
    sourceImage,
    prompt,
    seconds,
    localOnly: true,
  };
}

export function runDemo() {
  return {
    day: 39,
    title: "FramePack 本地视频 Profile",
    readiness: evaluateFramePackReadiness({
      platform: "win32",
      gpuName: "NVIDIA GeForce RTX 5060 Ti",
      vramGb: 16,
      memoryGb: 32,
    }),
    job: buildFramePackJob({
      sourceImage: "outputs/day36-agent-cover.png",
      prompt: "slow camera move over a local agent dashboard",
    }),
  };
}
