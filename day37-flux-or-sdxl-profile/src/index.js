/**
 * Day 37：自包含学习源码。
 *
 * 这个文件属于 day37-flux-or-sdxl-profile，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：用配置 profile 表达 SDXL/FLUX 的硬件、许可和默认选择。
// 教学：导出常量：其它文件可以 import 这个值，适合放默认配置或元信息。
export const IMAGE_MODEL_PROFILES = [
  {
    id: "sdxl-base",
    family: "SDXL",
    task: "text-to-image",
    minVramGb: 8,
    recommendedVramGb: 12,
    licenseNote: "按实际下载来源阅读 license，适合学习默认路径。",
    windows5060Ti: "recommended",
    macAppleSilicon: "light-experiment",
  },
  {
    id: "flux-schnell",
    family: "FLUX.1",
    task: "text-to-image",
    minVramGb: 12,
    recommendedVramGb: 16,
    licenseNote: "FLUX.1 schnell 常用于快速实验，仍需确认模型许可。",
    windows5060Ti: "recommended",
    macAppleSilicon: "limited",
  },
  {
    id: "flux-dev",
    family: "FLUX.1",
    task: "text-to-image",
    minVramGb: 16,
    recommendedVramGb: 24,
    licenseNote: "FLUX.1 dev 更适合质量评估，默认不作为学习起步模型。",
    windows5060Ti: "advanced-only",
    macAppleSilicon: "not-default",
  },
];

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function getImageModelProfile(id) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const profile = IMAGE_MODEL_PROFILES.find((item) => item.id === id);
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!profile) {
    // 教学：抛出错误：让调用方知道当前流程不能继续。
    throw new Error(`unknown image model profile: ${id}`);
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return profile;
}

// 根据硬件给出保守建议；32B 或大视频模型不作为 16G 显存默认项。
// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function recommendImageProfile({ platform = "darwin", gpuVendor = "apple", vramGb = 0 } = {}) {
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (platform === "win32" && gpuVendor === "nvidia" && vramGb >= 16) {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return {
      defaultProfile: getImageModelProfile("sdxl-base"),
      advancedProfile: getImageModelProfile("flux-schnell"),
      note: "RTX 5060 Ti 16G 可以先用 SDXL，稳定后尝试 FLUX.1 schnell；FLUX dev 只做进阶评估。",
    };
  }
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (platform === "darwin") {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return {
      defaultProfile: getImageModelProfile("sdxl-base"),
      advancedProfile: null,
      note: "Mac 先用轻量图片工作流或 mock；重图像实验建议放到 Windows NVIDIA 机器。",
    };
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    defaultProfile: getImageModelProfile("sdxl-base"),
    advancedProfile: null,
    note: "未知硬件按 SDXL 起步，先确认本地模型和显存。",
  };
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo() {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 37,
    title: "SDXL/FLUX 本地模型 Profile",
    profiles: IMAGE_MODEL_PROFILES,
    mac: recommendImageProfile({ platform: "darwin", gpuVendor: "apple", vramGb: 16 }),
    windows5060Ti: recommendImageProfile({ platform: "win32", gpuVendor: "nvidia", vramGb: 16 }),
  };
}
