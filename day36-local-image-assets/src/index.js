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
  model = "sdxl-base",
  workflow = "text-to-image",
  seed = 0,
  width = 1024,
  height = 1024,
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
    .map((line) => JSON.parse(line));
}

export function filterAssetsByModel(records, model) {
  return records.filter((record) => record.model === model);
}

export function runDemo() {
  const records = [
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
