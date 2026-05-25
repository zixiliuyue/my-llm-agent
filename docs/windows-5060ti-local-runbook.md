# Win10 + RTX 5060 Ti 16G 本地运行演练指南

这份 runbook 面向“Mac 上学习和 mock，Windows 10 + RTX 5060 Ti 16G 上真实跑本地模型”的场景。它只给检查顺序和判断标准，不自动安装软件、不拉模型、不修改显卡驱动。

## 目标硬件假设

- 系统：Windows 10
- GPU：RTX 5060 Ti 16G
- 内存：32G
- 磁盘：2T NVMe
- Shell：PowerShell
- Node.js：>= 18.17
- 包管理器：npm

## 手动准备顺序

1. 安装并确认 NVIDIA 驱动。
2. 安装 Node.js LTS 或当前项目可用版本。
3. 安装 Ollama，确认本机 `http://127.0.0.1:11434` 可访问。
4. 手动拉文本模型：默认 `qwen2.5:7b`，进阶 `qwen2.5-coder:14b`。
5. 手动准备 ComfyUI 和 Python 环境。
6. 手动准备 SDXL 或 FLUX.1 schnell 模型。
7. 视频实验再准备 SVD/FramePack；Wan2.1 只作为评估候选。

## 基础检查命令

```powershell
# 用途：确认 Node.js 版本满足项目要求
# 执行目录：任意目录
# 结果判断：版本 >= 18.17
# 风险：只读
node --version
```

```powershell
# 用途：确认 npm 可执行
# 执行目录：任意目录
# 结果判断：输出 npm 版本
# 风险：只读
npm --version
```

```powershell
# 用途：确认 NVIDIA 驱动和显存可见
# 执行目录：任意目录
# 结果判断：能看到 RTX 5060 Ti 和约 16G 显存
# 风险：只读
nvidia-smi
```

```powershell
# 用途：运行项目本地只读 doctor
# 执行目录：<项目根目录>
# 结果判断：Node/npm 为 OK；Ollama/ComfyUI/FramePack 未启动时只给 WARN/INFO
# 风险：只读，不安装软件、不拉模型、不修改驱动
npm run doctor
```

## Ollama 检查

```powershell
# 用途：启动 Ollama 本机服务
# 执行目录：任意目录
# 结果判断：服务保持运行，另一个终端可访问 /api/tags
# 风险：占用本机端口 11434 和模型运行资源
ollama serve
```

```powershell
# 用途：拉取默认学习模型
# 执行目录：任意目录
# 结果判断：模型下载完成，ollama list 能看到 qwen2.5:7b
# 风险：会下载模型文件，占用磁盘；可能占用网络
ollama pull qwen2.5:7b
```

```powershell
# 用途：切换到代码实验模型并运行 day01
# 执行目录：<项目根目录>
# 结果判断：day01 输出 agent 回答
# 风险：调用本机 Ollama，占用 GPU 显存和内存
$env:OLLAMA_MODEL="qwen2.5-coder:14b"; npm run day01:ask -- "解释 agent loop"
```

判断 Ollama 是否用了 GPU：

- `nvidia-smi` 里能看到 Ollama 或相关进程占用显存。
- 推理时 GPU 利用率有变化。
- 如果只有 CPU 负载高，优先检查驱动、Ollama 版本、模型量化和环境配置。

## ComfyUI 检查

```powershell
# 用途：指定 ComfyUI 本机地址后查看 day33 请求结构
# 执行目录：<项目根目录>
# 结果判断：endpoint 为 http://127.0.0.1:8188
# 风险：只输出请求结构，不启动 ComfyUI
$env:COMFYUI_HOST="http://127.0.0.1:8188"; npm run day33:image
```

真实启动 ComfyUI 后再检查：

```powershell
# 用途：确认 doctor 能看到 ComfyUI 地址并尝试访问 /system_stats
# 执行目录：<项目根目录>
# 结果判断：ComfyUI API 可访问，或给出明确 WARN
# 风险：只读检查
$env:COMFYUI_HOST="http://127.0.0.1:8188"; npm run doctor
```

模型建议：

- 默认学习：SDXL。
- 进阶图片实验：FLUX.1 schnell。
- FLUX.1 dev：只做进阶评估，不作为 16G 显存默认学习模型。

## FramePack / 视频检查

```powershell
# 用途：查看 FramePack 本地任务结构
# 执行目录：<项目根目录>
# 结果判断：job.endpoint 为 http://127.0.0.1:7860
# 风险：只输出任务结构，不启动 FramePack
$env:FRAMEPACK_HOST="http://127.0.0.1:7860"; npm run day39:video
```

```powershell
# 用途：查看 Wan 是否进入评估清单
# 执行目录：<项目根目录>
# 结果判断：wan2.1-1.3b-eval 是候选，wan2.1-14b-eval 不是 16G 默认项
# 风险：只读，不下载视频模型
npm run day40:video
```

视频建议：

- 第一步：SVD 图生短视频，降低帧数和分辨率。
- 第二步：FramePack 本地短视频实验。
- 第三步：Wan2.1 1.3B 作为候选评估。
- 不建议：把 Wan2.1 14B 或更重模型作为 RTX 5060 Ti 16G 默认路径。

## Mac mock 到 Windows 实跑的切换

Mac 上先跑：

```bash
# 用途：在 Mac 上用 mock 流程理解多模态链路
# 执行目录：<项目根目录>
# 结果判断：输出完整 JSON，不访问真实模型服务
# 风险：只读 mock
npm run local:multimodal -- "一个本地 agent 平台封面图"
```

Windows 上再切换：

```powershell
# 用途：在 Windows 上保持同一套源码，切换本机模型服务地址
# 执行目录：<项目根目录>
# 结果判断：doctor 显示本机地址，真实服务可访问时为 OK
# 风险：只读检查；真实模型服务本身会占用资源
$env:OLLAMA_HOST="http://127.0.0.1:11434"
$env:COMFYUI_HOST="http://127.0.0.1:8188"
$env:FRAMEPACK_HOST="http://127.0.0.1:7860"
npm run doctor
```

## 常见失败判断

| 现象 | 优先判断 | 下一步 |
|---|---|---|
| `fetch failed` | 本地服务未启动或端口不通 | 启动 Ollama/ComfyUI/FramePack，再跑 `npm run doctor` |
| 找不到模型 | 模型未拉取或名称不一致 | `ollama list`，确认 `OLLAMA_MODEL` |
| `nvidia-smi` 不存在 | 驱动或 PATH 问题 | 先修 NVIDIA 驱动，不改项目代码 |
| 图片生成慢或失败 | 显存/工作流/模型不匹配 | 先 SDXL，降低分辨率，再试 FLUX |
| 视频直接 OOM | 视频模型过重 | 降帧数、降分辨率，先 SVD/FramePack |
| Python 包冲突 | ComfyUI/FramePack 环境混用 | 分开 Python venv，不在项目里自动安装 |
