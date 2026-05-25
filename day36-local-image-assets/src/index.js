/**
 * Day 36：自包含学习源码。
 *
 * 这个文件属于 day36-local-image-assets，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：为本地生成图片建立可复盘的资产元数据，而不是只留散落文件。
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import path from "node:path";

// 教学：定义变量：这个值后面会被更新，所以使用 let。
let nextAssetId = 1;

// 教学：普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function isoNow() {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return new Date().toISOString();
}

// 资产路径只允许相对路径或 file://，避免把云 URL 混进本地资产库。
// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function assertLocalAssetPath(outputPath) {
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!outputPath || typeof outputPath !== "string") {
    // 教学：抛出错误：让调用方知道当前流程不能继续。
    throw new Error("outputPath is required");
  }
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (/^https?:\/\//i.test(outputPath)) {
    // 教学：抛出错误：让调用方知道当前流程不能继续。
    throw new Error(`asset path must be local: ${outputPath}`);
  }
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (outputPath.startsWith("file://")) {
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return outputPath;
  }
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const normalized = path.normalize(outputPath);
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (normalized.startsWith("..")) {
    // 教学：抛出错误：让调用方知道当前流程不能继续。
    throw new Error(`asset path must stay in local workspace: ${outputPath}`);
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return normalized;
}

// 创建图片资产记录；记录 prompt、模型、workflow、seed 方便以后复现实验。
// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createImageAssetRecord({
  prompt,
  outputPath,
  // 教学：更新状态：这里会改变前面定义的变量或对象字段。
  model = "sdxl-base",
  // 教学：更新状态：这里会改变前面定义的变量或对象字段。
  workflow = "text-to-image",
  // 教学：更新状态：这里会改变前面定义的变量或对象字段。
  seed = 0,
  // 教学：更新状态：这里会改变前面定义的变量或对象字段。
  width = 1024,
  // 教学：更新状态：这里会改变前面定义的变量或对象字段。
  height = 1024,
  // 教学：更新状态：这里会改变前面定义的变量或对象字段。
  createdAt = isoNow(),
}) {
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!prompt || typeof prompt !== "string") {
    // 教学：抛出错误：让调用方知道当前流程不能继续。
    throw new Error("prompt is required");
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
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

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function serializeAssets(records) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return records.map((record) => JSON.stringify(record)).join("\n");
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function parseAssets(jsonl) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return jsonl
    .split(/\r?\n/)
    .filter(Boolean)
    // 教学：处理 JSON：把对象和字符串互相转换，便于协议传输或断言。
    .map((line) => JSON.parse(line));
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function filterAssetsByModel(records, model) {
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return records.filter((record) => record.model === model);
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo() {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const records = [
    // 教学：调用函数：把当前数据交给已有逻辑处理。
    createImageAssetRecord({
      prompt: "local agent dashboard cover",
      outputPath: "outputs/day36-agent-cover.png",
      model: "sdxl-base",
      seed: 5060,
    }),
  ];
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 36,
    title: "本地图片资产元数据",
    records,
    jsonl: serializeAssets(records),
  };
}
