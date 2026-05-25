# Day 61 - Agent Sandbox Security

## 概念

这一日补齐真实安全沙盒的核心边界：容器隔离、临时 workspace、网络 allowlist、文件读写 allowlist、secret 注入与脱敏、prompt injection 防御、tool output 不可信边界、PII/secret scanning、MCP/tool allowlist 和 audit log。

## 代码结构

- `src/index.js`：策略判定、脱敏、dry-run 容器规格、审计事件。
- `src/cli.js`：输出安全和阻断两条示例。
- `test/run.test.js`：覆盖注入、网络、文件、tool/MCP allowlist 和脱敏。

## 运行

```bash
# 用途：运行安全沙盒 dry-run demo
# 执行目录：项目根目录
# 结果判断：blocked 示例被阻断，safe 示例只允许 dry-run
# 风险：不启动容器、不访问网络、不写真实文件
npm run day61:start
```

## 实验

1. 把 `shell.exec` 加入 `toolAllowlist`，观察 prompt injection 仍会阻断。
2. 把 `evil.example.com` 加入网络 allowlist，观察文件 allowlist 仍会阻断。
3. 在 tool output 中加入邮箱、手机号、token，确认输出被脱敏。

## 复盘

- 模型输出和工具输出都不可信，必须先过策略、解析、脱敏和审计。
- allowlist 要由宿主 runtime 强制执行，不能只写在 prompt 里。
- secret 只通过 `valueFrom` 注入，不能进入 prompt、日志或最终报告。
