// 学习目标：用 mock 友好的方式封装 ComfyUI 文生图 HTTP 协议。
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

export function normalizeLocalComfyHost(host = process.env.COMFYUI_HOST ?? "http://127.0.0.1:8188") {
  const url = new URL(host);
  if (!["http:", "https:"].includes(url.protocol) || !LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(`ComfyUI host must be local: ${host}`);
  }
  return url.origin;
}

// ComfyUI /prompt 需要 workflow prompt 和 client_id，本函数只组包不发请求。
export function buildPromptRequest({ workflow, clientId = "day33-demo" }) {
  if (!workflow || typeof workflow !== "object") {
    throw new Error("workflow must be an object");
  }
  return {
    prompt: workflow,
    client_id: clientId,
  };
}

function buildViewUrl(host, image = {}) {
  const url = new URL("/view", host);
  url.searchParams.set("filename", image.filename);
  url.searchParams.set("type", image.type ?? "output");
  if (image.subfolder) {
    url.searchParams.set("subfolder", image.subfolder);
  }
  return url.toString();
}

// 创建 ComfyUI 客户端；fetchImpl 可注入 mock，测试不依赖真实 ComfyUI。
export function createComfyClient({ host, fetchImpl = globalThis.fetch } = {}) {
  const baseUrl = normalizeLocalComfyHost(host);
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch implementation is required");
  }

  return {
    baseUrl,
    async queuePrompt(workflow, clientId = "day33-demo") {
      const response = await fetchImpl(new URL("/prompt", baseUrl), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildPromptRequest({ workflow, clientId })),
      });
      if (!response.ok) {
        throw new Error(`ComfyUI /prompt failed: ${response.status}`);
      }
      return response.json();
    },
    async getHistory(promptId) {
      const response = await fetchImpl(new URL(`/history/${promptId}`, baseUrl));
      if (!response.ok) {
        throw new Error(`ComfyUI /history failed: ${response.status}`);
      }
      return response.json();
    },
    viewImageUrl(image) {
      return buildViewUrl(baseUrl, image);
    },
  };
}

export function extractOutputImages(history, promptId) {
  const outputs = history?.[promptId]?.outputs ?? {};
  return Object.values(outputs).flatMap((node) => node.images ?? []);
}

export function createDemoWorkflow(prompt = "a small local robot writing Chinese notes") {
  return {
    "1": {
      class_type: "CLIPTextEncode",
      inputs: { text: prompt },
    },
    "2": {
      class_type: "SaveImage",
      inputs: { filename_prefix: "day33" },
    },
  };
}

export function runDemo() {
  const workflow = createDemoWorkflow();
  const request = buildPromptRequest({ workflow });
  return {
    day: 33,
    title: "ComfyUI 文生图适配器",
    localOnly: true,
    endpoint: normalizeLocalComfyHost(),
    request,
  };
}
