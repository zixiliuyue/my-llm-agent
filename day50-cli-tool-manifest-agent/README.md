# Day 50：CLI 工具接入 Agent

## 概念

这一节把 CLI 能力描述成 Agent 可调用的 manifest：命令、参数、环境枚举、风险等级和输出契约都写清楚。Agent 只能规划命令，不自由拼接未知 base URL。

## 代码结构

- `src/index.js`：CLI tool manifest、请求校验、命令规划和敏感字段脱敏。
- `src/cli.js`：输出 host search、chart render 和 blocked 请求 demo。
- `test/run.test.js`：验证参数校验、环境枚举和调试信息脱敏。

## 运行

```bash
# 用途：运行 CLI 工具 manifest demo
# 执行目录：<项目根目录>/day50-cli-tool-manifest-agent
# 结果判断：输出 planned/blocked 的命令规划
# 风险：只做 dry-run 规划，不执行真实 CLI
npm run demo
```

PowerShell：

```powershell
# 用途：在 Windows 上运行同一个 CLI manifest demo
# 执行目录：<项目根目录>\day50-cli-tool-manifest-agent
# 结果判断：commandPreview 只包含 dev/sit/pro 环境
# 风险：只做 dry-run 规划，不访问远程环境
npm run demo
```

## 实验

把 `env` 改成 `custom`，观察请求为什么 blocked；给参数加 `baseUrl`，观察为什么拒绝 free-form endpoint。

## 复盘

CLI 接入 Agent 的关键是输出契约和边界：命令怎么调用、输出怎么验证、哪些字段脱敏、哪些环境允许，都必须由代码控制。
