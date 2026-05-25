# Day 38：本地短视频第一步

## 概念

视频生成先从“本地图片转短视频”开始，不直接追求复杂文生视频。Day38 用 SVD 图生短视频 profile 表达帧数、尺寸、显存建议和硬件边界。

## 代码结构

- `src/index.js`：SVD profile、视频尺寸解析、图生视频计划和硬件建议。
- `src/cli.js`：输出一个本地图片转短视频 plan。
- `test/run.test.js`：覆盖本地图片限制、尺寸解析和 Windows/Mac 建议。

## 运行

```bash
# 用途：查看图生短视频计划
# 执行目录：<项目根目录>/day38-local-video-first-step
# 结果判断：输出 plan.localOnly 为 true
# 风险：只输出计划，不执行视频推理
npm run demo
```

PowerShell：

```powershell
# 用途：在 Windows 10 上查看 RTX 5060 Ti 的短视频起步建议
# 执行目录：<项目根目录>\day38-local-video-first-step
# 结果判断：windows5060Ti.canTry 为 true
# 风险：只读，不启动模型
npm run demo
```

## 实验

真实跑视频前先把帧数和分辨率降下来，例如 14 帧、576x1024。Mac 侧建议保留 mock 和 plan，Windows NVIDIA 侧再做真实推理。

## 复盘

视频实验成本明显高于图片，学习路径要先固定输入图片和输出参数，再逐步替换真实后端。
