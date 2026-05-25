# Day 65 - Multimodal Agent Understanding

## 概念

这一日补齐多模态理解能力：图片 caption、OCR、物体识别、图片质量评分、NSFW/PII/EXIF 清理、语音转写、视频关键帧分析和多模态 eval。

## 代码结构

- `src/index.js`：mock vision/audio/video adapter、质量评分、关键帧、eval。
- `src/cli.js`：输出图片、语音、视频综合分析 JSON。
- `test/run.test.js`：覆盖多模态边界。

## 运行

```bash
# 用途：运行 day65 多模态理解 demo
# 执行目录：项目根目录
# 结果判断：evaluation.passed=true，OCR 中 PII 已脱敏
# 风险：默认 mock adapter，不读取真实图片、音频或视频文件
npm run day65:start
```

## Windows 5060 Ti 替换点

在 Win10 + RTX 5060 Ti 16G 上，可以把 `createMockMultimodalAdapter` 替换成本地模型接口：

- 图片：本地 vision model 或 Ollama vision 模型。
- OCR：PaddleOCR / Tesseract / 本地视觉模型。
- 音频：Whisper / faster-whisper。
- 视频：先抽关键帧，再用图片 adapter 分析。

## 复盘

- 多模态不是只“能看图”，还要有质量、隐私、EXIF 和 eval。
- 视频理解优先拆成关键帧和时间线，避免直接把长视频塞给模型。
- 本教学版默认 mock，真实模型接入必须保留脱敏和质量 gate。
