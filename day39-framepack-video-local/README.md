# Day 39：FramePack 本地视频 Profile

## 概念

FramePack 更适合放在 Windows/Linux + NVIDIA GPU 上做本地视频实验。Day39 不安装 FramePack，只定义 readiness 检查和本地任务结构，让 Mac 可以跑测试，Windows 5060 Ti 可以接真实服务。

## 代码结构

- `src/index.js`：FramePack profile、硬件 readiness 和本地任务组包。
- `src/cli.js`：输出 RTX 5060 Ti 16G 示例。
- `test/run.test.js`：覆盖 Windows 可尝试、Mac 不默认和远程地址拒绝。

## 运行

```bash
# 用途：查看 FramePack 本地视频建议
# 执行目录：<项目根目录>/day39-framepack-video-local
# 结果判断：readiness.ready 为 true 的示例对应 Windows 5060 Ti
# 风险：只输出任务结构，不调用 FramePack
npm run demo
```

PowerShell：

```powershell
# 用途：在 Windows 10 上查看本机视频任务结构
# 执行目录：<项目根目录>\day39-framepack-video-local
# 结果判断：job.endpoint 为 http://127.0.0.1:7860
# 风险：只读，不启动 Gradio/FramePack
$env:FRAMEPACK_HOST="http://127.0.0.1:7860"; npm run demo
```

## 实验

真实跑 FramePack 前先确认驱动、Python 环境、模型权重和本地端口。学习项目只保留任务结构和检查逻辑。

## 复盘

Mac 与 Windows 共用同一套源码；差异放在 readiness 和 profile，而不是分叉业务代码。
