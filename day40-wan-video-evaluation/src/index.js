/**
 * Day 40：自包含学习源码。
 *
 * 这个文件属于 day40-wan-video-evaluation，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：把 Wan 视频模型放在评估 profile 中，不作为默认学习路径。
// 导出常量：其它文件可以 import 这个值，适合放默认配置或元信息。
export const VIDEO_EVALUATION_PROFILES = [
  {
    id: "svd-image-to-video",
    family: "SVD",
    defaultForLearning: true,
    localOnly: true,
    recommendedVramGb: 16,
    note: "短视频第一步，适合从本地图片输入开始。",
  },
  {
    id: "framepack-local",
    family: "FramePack",
    defaultForLearning: false,
    localOnly: true,
    recommendedVramGb: 16,
    note: "Windows/NVIDIA 本地短视频实验候选。",
  },
  {
    id: "wan2.1-1.3b-eval",
    family: "Wan2.1",
    defaultForLearning: false,
    localOnly: true,
    recommendedVramGb: 16,
    note: "只作为 480P 评估候选，先确认本地环境和模型许可。",
  },
  {
    id: "wan2.1-14b-eval",
    family: "Wan2.1",
    defaultForLearning: false,
    localOnly: true,
    recommendedVramGb: 24,
    note: "14B 不作为 RTX 5060 Ti 16G 默认推荐，只做进阶评估记录。",
  },
];

export function getVideoEvaluationProfile(id) {
  const profile = VIDEO_EVALUATION_PROFILES.find((item) => item.id === id);
  if (!profile) {
    throw new Error(`unknown video profile: ${id}`);
  }
  return profile;
}

export function rankVideoOptions({ platform = "darwin", gpuVendor = "apple", vramGb = 0 } = {}) {
  const base = ["svd-image-to-video"];
  if (platform === "win32" && gpuVendor === "nvidia" && vramGb >= 16) {
    base.push("framepack-local", "wan2.1-1.3b-eval");
  }
  if (vramGb >= 24) {
    base.push("wan2.1-14b-eval");
  }
  return base.map(getVideoEvaluationProfile);
}

// 给 day40 输出最终学习建议：Wan 可评估，但不抢默认路径。
export function evaluateWanForLearning(hardware = {}) {
  const ranked = rankVideoOptions(hardware);
  const wan13b = getVideoEvaluationProfile("wan2.1-1.3b-eval");
  const includesWan13b = ranked.some((item) => item.id === wan13b.id);
  return {
    ranked,
    defaultProfile: getVideoEvaluationProfile("svd-image-to-video"),
    wanCandidate: includesWan13b ? wan13b : null,
    decision:
      includesWan13b
        ? "可以把 Wan2.1 1.3B 放入 Windows 5060 Ti 的评估清单，但默认学习路径仍从 SVD/FramePack 开始。"
        : "当前硬件先保留 Wan 评估记录，不建议作为真实运行目标。",
  };
}

export function runDemo() {
  return {
    day: 40,
    title: "Wan 视频模型评估",
    profiles: VIDEO_EVALUATION_PROFILES,
    mac: evaluateWanForLearning({ platform: "darwin", gpuVendor: "apple", vramGb: 16 }),
    windows5060Ti: evaluateWanForLearning({ platform: "win32", gpuVendor: "nvidia", vramGb: 16 }),
  };
}
