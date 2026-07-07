/**
 * Day 36：自包含学习源码。
 *
 * 这个文件属于 day36-local-image-assets，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：为本地生成图片建立可复盘的资产元数据，而不是只留散落文件。
import path from "node:path";

let nextAssetId = 1;

function isoNow() {
  return new Date().toISOString();
}

// 资产路径只允许相对路径或 file://，避免把云 URL 混进本地资产库。
export function assertLocalAssetPath(outputPath) {
  if (!outputPath || typeof outputPath !== "string") {
    throw new Error("outputPath is required");
  }
  if (/^https?:\/\//i.test(outputPath)) {
    throw new Error(`asset path must be local: ${outputPath}`);
  }
  if (outputPath.startsWith("file://")) {
    return outputPath;
  }
  const normalized = path.normalize(outputPath);
  if (normalized.startsWith("..")) {
    throw new Error(`asset path must stay in local workspace: ${outputPath}`);
  }
  return normalized;
}

// 创建图片资产记录；记录 prompt、模型、workflow、seed 方便以后复现实验。
export function createImageAssetRecord({
  prompt,
  outputPath,
  // 更新状态：这里会改变前面定义的变量或对象字段。
  model = "sdxl-base",
  // 更新状态：这里会改变前面定义的变量或对象字段。
  workflow = "text-to-image",
  // 更新状态：这里会改变前面定义的变量或对象字段。
  seed = 0,
  // 更新状态：这里会改变前面定义的变量或对象字段。
  width = 1024,
  // 更新状态：这里会改变前面定义的变量或对象字段。
  height = 1024,
  // 更新状态：这里会改变前面定义的变量或对象字段。
  createdAt = isoNow(),
}) {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("prompt is required");
  }
  return {
    id: `asset-${nextAssetId++}`,
    type: "image",
    prompt,
    outputPath: assertLocalAssetPath(outputPath),
    model,
    workflow,
    seed,
    width,
    height,
    createdAt,
    localOnly: true,
  };
}

export function serializeAssets(records) {
  return records.map((record) => JSON.stringify(record)).join("\n");
}

export function parseAssets(jsonl) {
  return jsonl
    .split(/\r?\n/)
    .filter(Boolean)
    // 处理 JSON：把对象和字符串互相转换，便于协议传输或断言。
    .map((line) => JSON.parse(line));
}

export function filterAssetsByModel(records, model) {
  return records.filter((record) => record.model === model);
}

export function runDemo() {
  const records = [
    // 调用函数：把当前数据交给已有逻辑处理。
    createImageAssetRecord({
      prompt: "local agent dashboard cover",
      outputPath: "outputs/day36-agent-cover.png",
      model: "sdxl-base",
      seed: 5060,
    }),
  ];
  return {
    day: 36,
    title: "本地图片资产元数据",
    records,
    jsonl: serializeAssets(records),
  };
}
