# Day 37：SDXL / FLUX 本地模型 Profile

## 概念

模型选择不是越大越好。Day37 用 profile 描述 SDXL、FLUX.1 schnell、FLUX.1 dev 的显存建议、许可提醒和默认级别。Windows + RTX 5060 Ti 16G 可以实验 FLUX schnell，但默认仍从 SDXL 起步。

## 代码结构

- `src/index.js`：图片模型 profile、按硬件推荐默认模型。
- `src/cli.js`：输出 Mac 与 Windows 5060 Ti 的建议。
- `test/run.test.js`：覆盖默认推荐、进阶推荐和未知模型拒绝。

## 运行

```bash
# 用途：查看图片模型 profile
# 执行目录：<项目根目录>/day37-flux-or-sdxl-profile
# 结果判断：输出 profiles、mac、windows5060Ti
# 风险：只读，不下载模型
npm run demo
```

PowerShell：

```powershell
# 用途：在 Windows 机器查看 5060 Ti 16G 建议
# 执行目录：<项目根目录>\day37-flux-or-sdxl-profile
# 结果判断：defaultProfile 为 sdxl-base，advancedProfile 为 flux-schnell
# 风险：只读，不改显卡驱动
npm run demo
```

## 实验

真实下载模型前先读对应 license 和硬件说明。16G 显存不要把 32B 或高负载视频模型作为默认学习路径。

## 复盘

Profile 的价值是把“经验建议”落到可测试配置里，避免每次都靠口头判断。
