# day31-day40 端到端 mock 练习

这个练习把本地多模态链路串起来，但仍然不访问真实 Ollama、ComfyUI 或 FramePack。

流程：

1. day35：把用户一句话优化成图片 prompt。
2. day33：把 prompt 放进 ComfyUI workflow 请求结构。
3. day34：把图片任务放入队列并推进到 done。
4. day36：生成本地图片资产元数据。
5. day38：用图片资产生成 SVD 图生短视频 plan。
6. day39：评估 Windows 5060 Ti 上的 FramePack readiness。
7. day40：评估 Wan 是否只作为候选。

## 运行

```bash
# 用途：运行本地多模态端到端 mock
# 执行目录：<项目根目录>
# 结果判断：输出 JSON，包含 optimizedPrompt、comfyRequest、queue、asset、videoPlan、framepack、wan
# 风险：mock 流程，不访问真实模型服务，不生成文件
npm run local:multimodal -- "一个本地 agent 平台封面图"
```

PowerShell：

```powershell
# 用途：在 Windows 10 上运行同一个 mock 链路
# 执行目录：<项目根目录>
# 结果判断：输出 JSON，framepack.ready 为 true 的示例代表 RTX 5060 Ti 16G 可尝试
# 风险：mock 流程，不启动 Ollama/ComfyUI/FramePack
npm run local:multimodal -- "一个 Windows 5060 Ti 工作站正在生成教学封面"
```

## 输出字段怎么读

- `optimizedPrompt`：LLM 应该产出的图片 prompt 结构；本 demo 用确定性 fallback。
- `comfyRequest`：将来发给 ComfyUI `/prompt` 的请求体。
- `queue`：图片任务状态，证明 UI 不需要阻塞等待。
- `asset`：本地图片资产记录，包含 prompt、seed、workflow、model、outputPath。
- `videoPlan`：基于图片资产的 SVD 图生短视频计划。
- `framepack`：Windows/NVIDIA 本地短视频 readiness。
- `wan`：Wan2.1 是否进入评估清单；16G 显存不默认选 14B。

## 真实服务替换点

- 把 `comfyRequest` 发给 `COMFYUI_HOST/prompt`。
- 用 day33 的 `/history/{prompt_id}` 和 `/view` 取图。
- 把真实输出路径写入 day36 资产记录。
- 用真实图片路径进入 day38/day39 视频计划。

替换真实服务前先跑：

```bash
# 用途：确认本机服务地址和硬件状态
# 执行目录：<项目根目录>
# 结果判断：Node/npm OK；真实服务没启动时给 WARN/INFO
# 风险：只读
npm run doctor
```
