# Day 33：ComfyUI 文生图适配器

## 概念

ComfyUI 的文生图流程不是“模型直接返回图片”，而是提交 workflow 到 `/prompt`，再从 `/history/{prompt_id}` 查询输出，最后用 `/view` 读取图片。Day33 只封装这个本地协议，不要求真实 ComfyUI 在线。

## 代码结构

- `src/index.js`：ComfyUI 本机地址校验、`/prompt` 请求组包、历史结果解析和图片 URL 生成。
- `src/cli.js`：输出一个最小 workflow 请求示例。
- `test/run.test.js`：用 mock fetch 覆盖提交、查询和图片 URL。

## 运行

```bash
# 用途：查看 ComfyUI 文生图请求结构
# 执行目录：<项目根目录>/day33-comfyui-text-to-image
# 结果判断：输出 endpoint 和 request.prompt
# 风险：只输出请求结构，不访问真实 ComfyUI
npm run demo
```

PowerShell：

```powershell
# 用途：指定 Windows 本机 ComfyUI 地址
# 执行目录：<项目根目录>\day33-comfyui-text-to-image
# 结果判断：endpoint 为 http://127.0.0.1:8188
# 风险：只读 demo，不自动启动 ComfyUI
$env:COMFYUI_HOST="http://127.0.0.1:8188"; npm run demo
```

## 实验

真实实验前先手动启动 ComfyUI，再把已有 workflow JSON 接入 `buildPromptRequest`。本仓库不会自动安装 ComfyUI，也不会下载 SDXL/FLUX 模型。

## 复盘

Adapter 的重点是协议清楚、边界清楚：提交、轮询、取图都由代码明确处理，测试通过 mock 保证学习流程稳定。
