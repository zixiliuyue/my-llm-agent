# Day 31：本地运行环境检测

## 概念

这一节把“我的 Mac 能不能跑、本机 Windows + RTX 5060 Ti 能不能跑”拆成只读检查项：Node.js、Ollama 地址、ComfyUI 地址、Python、GPU 和模型目录。它不安装软件、不下载模型、不修改驱动，只把风险和下一步建议说清楚。

## 代码结构

- `src/index.js`：纯函数形式的本地环境报告，便于 mock 测试。
- `src/cli.js`：输出 JSON demo。
- `test/run.test.js`：覆盖本机地址校验、Windows 5060 Ti 建议和远程地址拒绝。

## 运行

```bash
# 用途：运行 day31 本地环境检测 demo
# 执行目录：<项目根目录>/day31-local-runtime-doctor
# 结果判断：输出 JSON，report.localOnly 为 true
# 风险：只读，不访问网络、不安装软件
npm run demo
```

PowerShell：

```powershell
# 用途：在 Windows 10 上运行同一个 demo
# 执行目录：<项目根目录>\day31-local-runtime-doctor
# 结果判断：输出 JSON，远程地址会被标记为 error
# 风险：只读，不修改系统配置
npm run demo
```

## 实验

可以在根目录运行 `npm run doctor` 做真实只读检查。Mac 适合先跑 `qwen2.5:7b`；Windows + RTX 5060 Ti 16G 可以尝试 `qwen2.5-coder:14b`、SDXL/FLUX schnell 和后续短视频实验。

## 复盘

环境检测的边界是“报告事实和建议”，不是替用户安装或下载。学习项目默认本地优先，任何模型服务地址都应先确认是 localhost。
