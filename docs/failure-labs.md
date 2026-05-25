# 错误驱动实验

这组实验故意制造失败，训练你把错误输出翻译成下一步动作。所有实验默认只读或 mock，不需要真实模型。

## 实验 1：Ollama 未启动

```bash
# 用途：观察 Ollama 未启动时 doctor 如何提示
# 执行目录：<项目根目录>
# 结果判断：显示无法访问 Ollama API，并给出 ollama serve / ollama pull 提示
# 风险：只读检查
OLLAMA_HOST=http://127.0.0.1:11434 npm run doctor
```

你应该能回答：

- 这是项目代码坏了，还是本地服务没启动？
- 下一步应该启动服务、拉模型，还是改源码？

## 实验 2：默认模型没拉取

```bash
# 用途：观察 OLLAMA_MODEL 指向不存在模型时的提示
# 执行目录：<项目根目录>
# 结果判断：Ollama 可访问但默认模型未安装时显示 WARN
# 风险：如果 Ollama 正在运行，会访问本机 /api/tags；不会拉模型
OLLAMA_MODEL=not-exist:latest npm run doctor
```

你应该能回答：

- `OLLAMA_HOST` 和 `OLLAMA_MODEL` 分别控制什么？
- 为什么 doctor 只提示 `ollama pull`，不自动执行？

## 实验 3：ComfyUI 写成远程地址

```bash
# 用途：验证 provider 地址白名单会拒绝远程 ComfyUI
# 执行目录：<项目根目录>
# 结果判断：day33 报 ComfyUI host must be local
# 风险：不会访问远程地址
COMFYUI_HOST=https://example.com npm run day33:image
```

PowerShell：

```powershell
# 用途：Windows 上验证同样的本地地址边界
# 执行目录：<项目根目录>
# 结果判断：day33 报 ComfyUI host must be local
# 风险：不会访问远程地址
$env:COMFYUI_HOST="https://example.com"; npm run day33:image
```

你应该能回答：

- 为什么学习项目要拒绝远程图片服务？
- 如果未来真的要接远程服务，应该在哪里新增审批和鉴权？

## 实验 4：Ollama JSON 解析失败

day35 的 `parseOllamaPromptResponse` 会在模型返回非 JSON 时退回确定性 prompt 优化。

```bash
# 用途：验证 prompt optimizer 的 fallback 仍能输出本地 ComfyUI handoff
# 执行目录：<项目根目录>
# 结果判断：day35 输出 optimized.handoff.provider 为 comfy:image
# 风险：默认不访问 Ollama
npm run day35:prompt -- "一个失败恢复实验封面"
```

你应该能回答：

- 为什么模型输出 JSON 失败不能让流程崩掉？
- fallback 应该保持哪些安全边界？

## 实验 5：队列任务卡住

day34 队列状态机没有自动假装任务完成。真实接 ComfyUI 时，如果任务长期 running，UI 应该展示状态并允许错误/取消。

```bash
# 用途：查看队列状态 demo
# 执行目录：<项目根目录>
# 结果判断：summary 里能看到 queued/running 状态
# 风险：只读，不调用 ComfyUI
npm run day34:start
```

你应该能回答：

- 长任务为什么不能用同步 HTTP 请求一直等待？
- running 太久时，UI 至少要展示哪些信息？

## 实验 6：Windows 有 GPU 但没有 nvidia-smi

```powershell
# 用途：确认 Windows 是否能看到 NVIDIA 驱动工具
# 执行目录：任意目录
# 结果判断：输出 GPU 名称和显存；如果命令不存在，先修驱动/PATH
# 风险：只读
nvidia-smi
```

你应该能回答：

- `nvidia-smi` 不存在时，应该先改项目代码吗？
- 为什么 doctor 只提示，不自动安装驱动？

## 实验 7：FramePack 地址写成远程地址

```bash
# 用途：验证 FramePack 任务只能指向本机端口
# 执行目录：<项目根目录>
# 结果判断：测试中的远程 endpoint 会被拒绝
# 风险：只跑单元测试，不访问远程服务
npm run day39:test
```

你应该能回答：

- 视频服务为什么更需要本地边界？
- 如果视频任务失败，应该记录哪些输入方便复现？

## 实验 8：高危远程命令直接阻断

```bash
# 用途：验证远程命令审批链会阻断灾难性命令
# 执行目录：<项目根目录>
# 结果判断：day43 tests passed，blockedExample.status 为 blocked
# 风险：只跑 mock 测试，不执行命令
npm run day43:test
```

你应该能回答：

- 为什么 `rm -rf /` 不应该进入审批，而应直接 blocked？
- dry-run 输出和真实执行日志需要记录哪些字段？

## 实验 9：事故报告敏感字段脱敏

```bash
# 用途：验证事故报告会脱敏 token/password
# 执行目录：<项目根目录>
# 结果判断：day45 tests passed
# 风险：只跑 mock 测试，不访问事故系统
npm run day45:test
```

你应该能回答：

- 事故报告为什么不能直接复制原始日志？
- 后续动作为什么要包含 owner 和 due？
