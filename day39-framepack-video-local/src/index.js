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

// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function hasNvidiaName(gpuName = "") {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return /nvidia|rtx|geforce/i.test(gpuName);
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
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
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const issues = [];
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (platform !== "win32" && platform !== "linux") {
    issues.push("FramePack 本地实验优先 Windows/Linux，Mac 侧建议只保留 plan。");
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!hasNvidiaName(gpuName)) {
    issues.push("需要 NVIDIA GPU。");
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (vramGb < FRAMEPACK_PROFILE.minVramGb) {
    issues.push(`显存至少建议 ${FRAMEPACK_PROFILE.minVramGb}G。`);
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (memoryGb > 0 && memoryGb < 32) {
    issues.push("系统内存建议 32G 或以上。");
  }

  // 返回结果：调用方会拿到这个值继续后续流程。
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

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function buildFramePackJob({
  sourceImage,
  prompt,
  // 更新状态：这里会改变前面定义的变量或对象字段。
  seconds = 4,
  // 更新状态：这里会改变前面定义的变量或对象字段。
  endpoint = process.env.FRAMEPACK_HOST ?? FRAMEPACK_PROFILE.endpoint,
}) {
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!sourceImage || /^https?:\/\//i.test(sourceImage)) {
    // 抛出错误：让调用方知道当前流程不能继续。
    throw new Error("sourceImage must be a local image path");
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!prompt) {
    // 抛出错误：让调用方知道当前流程不能继续。
    throw new Error("prompt is required");
  }
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const url = new URL(endpoint);
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname)) {
    // 抛出错误：让调用方知道当前流程不能继续。
    throw new Error("FramePack endpoint must be local");
  }
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    provider: "framepack:video",
    endpoint: url.origin,
    sourceImage,
    prompt,
    seconds,
    localOnly: true,
  };
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo() {
  // 返回结果：调用方会拿到这个值继续后续流程。
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
