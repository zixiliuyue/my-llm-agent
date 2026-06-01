/**
 * Day 31：自包含学习源码。
 *
 * 这个文件属于 day31-local-runtime-doctor，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：用只读方式描述本机运行大模型、多模态工具前需要检查的环境。
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import os from "node:os";
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import path from "node:path";

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const DEFAULT_OLLAMA_HOST = "http://127.0.0.1:11434";
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const DEFAULT_COMFYUI_HOST = "http://127.0.0.1:8188";

// 判断地址是否只指向本机，避免学习项目误把任务发到云端或远程机器。
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function isLocalHttpUrl(value) {
  // try 块：把可能失败的代码包起来，方便 catch 给出更清晰的错误。
  try {
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const url = new URL(value);
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const localHosts = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
    // 返回结果：调用方会拿到这个值继续后续流程。
    return (url.protocol === "http:" || url.protocol === "https:") && localHosts.has(url.hostname);
  } catch {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return false;
  }
}

// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function normalizeModelDirs(inputDirs = []) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const home = os.homedir();
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const defaults = [
    path.join(home, ".ollama", "models"),
    path.join(home, "ComfyUI", "models"),
  ];
  // 返回结果：调用方会拿到这个值继续后续流程。
  return [...new Set([...inputDirs, ...defaults])];
}

// 生成演示输入；真实命令检查由根 doctor 负责，本 day 保持纯函数便于测试。
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function createDemoInput(overrides = {}) {
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    platform: overrides.platform ?? process.platform,
    arch: overrides.arch ?? process.arch,
    nodeVersion: overrides.nodeVersion ?? process.versions.node,
    ollamaHost: overrides.ollamaHost ?? process.env.OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST,
    comfyuiHost: overrides.comfyuiHost ?? process.env.COMFYUI_HOST ?? DEFAULT_COMFYUI_HOST,
    gpu: overrides.gpu ?? null,
    pythonVersion: overrides.pythonVersion ?? null,
    modelDirs: normalizeModelDirs(overrides.modelDirs),
    allowNetwork: false,
    autoInstall: false,
  };
}

// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function nodeVersionStatus(version) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const major = Number(String(version).split(".")[0]);
  // 返回结果：调用方会拿到这个值继续后续流程。
  return major >= 18 ? "ok" : "warn";
}

// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function gpuAdvice(input) {
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (input.gpu?.vendor === "nvidia") {
    // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const vram = Number(input.gpu.vramGb ?? 0);
    // 返回结果：调用方会拿到这个值继续后续流程。
    return {
      status: vram >= 16 ? "ok" : "warn",
      message:
        vram >= 16
          ? "NVIDIA 16G 显存适合 qwen2.5-coder:14b、SDXL/FLUX schnell 和短视频实验。"
          : "NVIDIA 显存偏小，建议先跑 7B 文本模型和低分辨率图片工作流。",
    };
  }
  // 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
  if (input.platform === "darwin" && input.arch === "arm64") {
    // 返回结果：调用方会拿到这个值继续后续流程。
    return {
      status: "ok",
      message: "Apple Silicon 适合本地 7B 文本模型和轻量图片队列，视频实验建议转到 NVIDIA Windows。"
    };
  }
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    status: "warn",
    message: "未发现明确 GPU 信息，先使用 mock 或 CPU 轻量实验。"
  };
}

// 输出统一检查报告；这里不执行安装、不下载模型、不访问网络。
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function inspectLocalRuntime(input = createDemoInput()) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const gpu = gpuAdvice(input);
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const checks = [
    {
      id: "node",
      status: nodeVersionStatus(input.nodeVersion),
      detail: `Node.js ${input.nodeVersion}`,
      hint: "项目要求 Node.js >= 18.17。"
    },
    {
      id: "ollama-host",
      status: isLocalHttpUrl(input.ollamaHost) ? "ok" : "error",
      detail: input.ollamaHost,
      hint: "OLLAMA_HOST 必须指向 localhost/127.0.0.1。"
    },
    {
      id: "comfyui-host",
      status: isLocalHttpUrl(input.comfyuiHost) ? "ok" : "error",
      detail: input.comfyuiHost,
      hint: "COMFYUI_HOST 必须指向本机 ComfyUI，例如 http://127.0.0.1:8188。"
    },
    {
      id: "python",
      status: input.pythonVersion ? "ok" : "warn",
      detail: input.pythonVersion ?? "未提供 Python 版本",
      hint: "ComfyUI/FramePack 通常需要单独的 Python 环境，本脚本不自动安装。"
    },
    {
      id: "gpu",
      status: gpu.status,
      detail: input.gpu ? `${input.gpu.name} ${input.gpu.vramGb ?? "?"}G` : "未提供 GPU 信息",
      hint: gpu.message
    },
    {
      id: "model-dirs",
      status: "info",
      detail: input.modelDirs.join("; "),
      hint: "仅展示候选目录，是否存在由根 npm run doctor 做只读检查。"
    }
  ];

  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    ok: checks.every((item) => item.status !== "error"),
    localOnly: true,
    autoInstall: false,
    checks,
  };
}

// 演示入口返回 JSON，便于根 examples:smoke 聚合运行。
// 导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function runDemo(overrides = {}) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const input = createDemoInput(overrides);
  // 返回结果：调用方会拿到这个值继续后续流程。
  return {
    day: 31,
    title: "本地运行环境检测",
    input,
    report: inspectLocalRuntime(input),
  };
}
