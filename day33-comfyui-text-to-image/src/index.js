/**
 * Day 33：自包含学习源码。
 *
 * 这个文件属于 day33-comfyui-text-to-image，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：用 mock 友好的方式封装 ComfyUI 文生图 HTTP 协议。
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function normalizeLocalComfyHost(host = process.env.COMFYUI_HOST ?? "http://127.0.0.1:8188") {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const url = new URL(host);
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!["http:", "https:"].includes(url.protocol) || !LOCAL_HOSTS.has(url.hostname)) {
    // 抛出错误：让调用方知道当前流程不能继续。
    throw new Error(`ComfyUI host must be local: ${host}`);
  }
  // 返回结果：调用方会拿到这个值继续后续流程。
  return url.origin;
}

// ComfyUI /prompt 需要 workflow prompt 和 client_id，本函数只组包不发请求。
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function buildPromptRequest({ workflow, clientId = "day33-demo" }) {
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (!workflow || typeof workflow !== "object") {
    // 抛出错误：让调用方知道当前流程不能继续。
    throw new Error("workflow must be an object");
  }
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    prompt: workflow,
    client_id: clientId,
  };
}

// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function buildViewUrl(host, image = {}) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const url = new URL("/view", host);
  url.searchParams.set("filename", image.filename);
  url.searchParams.set("type", image.type ?? "output");
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (image.subfolder) {
    url.searchParams.set("subfolder", image.subfolder);
  }
  // 返回结果：调用方会拿到这个值继续后续流程。
  return url.toString();
}

// 创建 ComfyUI 客户端；fetchImpl 可注入 mock，测试不依赖真实 ComfyUI。
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createComfyClient({ host, fetchImpl = globalThis.fetch } = {}) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const baseUrl = normalizeLocalComfyHost(host);
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (typeof fetchImpl !== "function") {
    // 抛出错误：让调用方知道当前流程不能继续。
    throw new Error("fetch implementation is required");
  }

  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    baseUrl,
    async queuePrompt(workflow, clientId = "day33-demo") {
      // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const response = await fetchImpl(new URL("/prompt", baseUrl), {
        method: "POST",
        headers: { "content-type": "application/json" },
        // 处理 JSON：把对象和字符串互相转换，便于协议传输或断言。
        body: JSON.stringify(buildPromptRequest({ workflow, clientId })),
      });
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (!response.ok) {
        // 抛出错误：让调用方知道当前流程不能继续。
        throw new Error(`ComfyUI /prompt failed: ${response.status}`);
      }
      // 返回结果：调用方会拿到这个值继续后续流程。
      return response.json();
    },
    async getHistory(promptId) {
      // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
      const response = await fetchImpl(new URL(`/history/${promptId}`, baseUrl));
      // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
      if (!response.ok) {
        // 抛出错误：让调用方知道当前流程不能继续。
        throw new Error(`ComfyUI /history failed: ${response.status}`);
      }
      // 返回结果：调用方会拿到这个值继续后续流程。
      return response.json();
    },
    // 调用函数：把当前数据交给已有逻辑处理。
    viewImageUrl(image) {
      // 返回结果：调用方会拿到这个值继续后续流程。
      return buildViewUrl(baseUrl, image);
    },
  };
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function extractOutputImages(history, promptId) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const outputs = history?.[promptId]?.outputs ?? {};
  // 返回结果：调用方会拿到这个值继续后续流程。
  return Object.values(outputs).flatMap((node) => node.images ?? []);
}

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createDemoWorkflow(prompt = "a small local robot writing Chinese notes") {
  // 返回结果：调用方会拿到这个值继续后续流程。
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

// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo() {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const workflow = createDemoWorkflow();
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const request = buildPromptRequest({ workflow });
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 33,
    title: "ComfyUI 文生图适配器",
    localOnly: true,
    endpoint: normalizeLocalComfyHost(),
    request,
  };
}
