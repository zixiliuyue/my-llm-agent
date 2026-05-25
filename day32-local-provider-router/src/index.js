// 学习目标：把文本、图片、视频供应商注册表限制在本机地址内。
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

// 本地 provider 的地址必须能被静态检查，避免把学习任务误发到云端。
export function assertLocalEndpoint(endpoint) {
  const url = new URL(endpoint);
  if (!["http:", "https:"].includes(url.protocol) || !LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(`provider endpoint must be local: ${endpoint}`);
  }
  return endpoint;
}

// 创建默认注册表；每个 provider 都自带用途和硬件提示。
export function createLocalProviderRegistry(overrides = {}) {
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

  for (const provider of registry) {
    assertLocalEndpoint(provider.endpoint);
  }
  return registry;
}

// 按任务类型选择 provider，确定性逻辑不交给模型判断。
export function selectProvider(kind, registry = createLocalProviderRegistry()) {
  const provider = registry.find((item) => item.kind === kind);
  if (!provider) {
    throw new Error(`unsupported provider kind: ${kind}`);
  }
  if (!provider.localOnly) {
    throw new Error(`provider must be local only: ${provider.id}`);
  }
  assertLocalEndpoint(provider.endpoint);
  return provider;
}

export function runDemo(overrides = {}) {
  const registry = createLocalProviderRegistry(overrides);
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
