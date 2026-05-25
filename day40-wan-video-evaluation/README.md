# Day 40：Wan 视频模型评估

## 概念

Wan2.1 可以作为视频方向的评估对象，但不能直接替代本地学习默认路径。Day40 把 SVD、FramePack、Wan2.1 1.3B、Wan2.1 14B 放到同一个评估表里，明确 16G 显存只把 Wan 1.3B 当候选，不把 14B 作为默认推荐。

## 代码结构

- `src/index.js`：视频评估 profile、按硬件排序和 Wan 决策。
- `src/cli.js`：输出 Mac 与 Windows 5060 Ti 的对比。
- `test/run.test.js`：覆盖 16G 排序、默认 profile 和 14B 非默认。

## 运行

```bash
# 用途：查看视频模型评估结论
# 执行目录：<项目根目录>/day40-wan-video-evaluation
# 结果判断：windows5060Ti.defaultProfile 为 svd-image-to-video
# 风险：只读，不下载视频模型
npm run demo
```

PowerShell：

```powershell
# 用途：在 Windows 10 上查看 Wan 是否进入评估清单
# 执行目录：<项目根目录>\day40-wan-video-evaluation
# 结果判断：wan2.1-1.3b-eval 是候选，wan2.1-14b-eval 不是 16G 默认项
# 风险：只读，不启动推理服务
npm run demo
```

## 实验

如果 Windows 机器已经准备好本地视频环境，可以先跑 SVD/FramePack，再把 Wan2.1 1.3B 作为对照实验。14B 只记录在评估 profile 中，不作为 RTX 5060 Ti 16G 的默认路径。

## 复盘

Day40 的目标是收敛技术路线：Mac 保持可运行和可测试，Windows 5060 Ti 承担重图像/视频实验，源码和命令保持一致。
