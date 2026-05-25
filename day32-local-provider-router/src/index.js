/**
 * Day 32：自包含学习源码。
 *
 * 这个文件属于 day32-local-provider-router，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：把文本、图片、视频供应商注册表限制在本机地址内。
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

// 本地 provider 的地址必须能被静态检查，避免把学习任务误发到云端。
// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function assertLocalEndpoint(endpoint) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const url = new URL(endpoint);
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!["http:", "https:"].includes(url.protocol) || !LOCAL_HOSTS.has(url.hostname)) {
    // 教学：抛出错误：让调用方知道当前流程不能继续。
    throw new Error(`provider endpoint must be local: ${endpoint}`);
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return endpoint;
}

// 创建默认注册表；每个 provider 都自带用途和硬件提示。
// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createLocalProviderRegistry(overrides = {}) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const registry = [
    {
      id: "ollama:text",
      kind: "text",
      endpoint: overrides.ollamaHost ?? process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434",
      localOnly: true,
      modelHint: "qwen2.5:7b 或 qwen2.5-coder:14b",
    },
    {
      id: "comfy:image",
      kind: "image",
      endpoint: overrides.comfyuiHost ?? process.env.COMFYUI_HOST ?? "http://127.0.0.1:8188",
      localOnly: true,
      modelHint: "SDXL 或 FLUX.1 schnell",
    },
    {
      id: "framepack:video",
      kind: "video",
      endpoint: overrides.framepackHost ?? process.env.FRAMEPACK_HOST ?? "http://127.0.0.1:7860",
      localOnly: true,
      modelHint: "Windows + NVIDIA 16G 显存优先",
    },
  ];

  // 教学：循环：按顺序处理多条数据或多个步骤。
  for (const provider of registry) {
    // 教学：调用函数：把当前数据交给已有逻辑处理。
    assertLocalEndpoint(provider.endpoint);
  }
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return registry;
}

// 按任务类型选择 provider，确定性逻辑不交给模型判断。
// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function selectProvider(kind, registry = createLocalProviderRegistry()) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const provider = registry.find((item) => item.kind === kind);
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!provider) {
    // 教学：抛出错误：让调用方知道当前流程不能继续。
    throw new Error(`unsupported provider kind: ${kind}`);
  }
  // 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!provider.localOnly) {
    // 教学：抛出错误：让调用方知道当前流程不能继续。
    throw new Error(`provider must be local only: ${provider.id}`);
  }
  // 教学：调用函数：把当前数据交给已有逻辑处理。
  assertLocalEndpoint(provider.endpoint);
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return provider;
}

// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo(overrides = {}) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const registry = createLocalProviderRegistry(overrides);
  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 32,
    title: "本地 provider 路由",
    registry,
    routes: {
      text: selectProvider("text", registry).id,
      image: selectProvider("image", registry).id,
      video: selectProvider("video", registry).id,
    },
  };
}
