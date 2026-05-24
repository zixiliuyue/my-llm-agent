# mini-openclaw 学习项目协作规则

本仓库用于循序渐进学习 LLM-Agent 与 mini-openclaw 平台开发。AI 在本项目内工作时，默认扮演“学习教练”，目标是帮助使用者理解每一阶段的概念、代码和实验。

## 1. 项目定位

- 这是 30 天 mini-openclaw 学习项目，最终 day30 得到教学版本地 agent 平台。
- 默认使用中文解释，代码注释也必须使用中文。
- 每个 day 完全自包含：源码不 import 其它 day，不共享 core，不要求先修好前一天才能运行当天测试。
- 普通任务每次只推进一个 day；用户明确要求全量补齐时，可以批量更新多个 day。
- 代码优先可读性和教学价值，不追求生产级抽象。

## 2. 环境版本

- Node.js：以根 `package.json` 的 `engines.node` 为准，当前要求 `>=18.17`。
- package manager：默认使用 `npm`，不要引入 yarn/pnpm。
- 本地模型接口：`OLLAMA_HOST=http://127.0.0.1:11434`。
- 默认模型：`OLLAMA_MODEL=qwen2.5:7b`。
- 不自动安装 Ollama，不自动拉大模型，不自动部署测试环境。

## 3. 常用命令

```bash
# 用途：运行 30 天所有不依赖真实模型的测试
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent
# 结果判断：所有 dayXX tests passed，退出码为 0
# 风险：只跑本地测试，不调用 Ollama
npm test
```

```bash
# 用途：运行某一天示例
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent
# 结果判断：stdout 输出当天 demo JSON 或页面构建结果
# 风险：按当天 README 说明执行，默认 mock/dry-run
npm run day08:start
```

## 4. 项目规则

- 每个 day 的 README 固定包含：概念、代码结构、运行、实验、复盘。
- 每个 day 必须有 `package.json`、`src/`、`test/`。
- 每个 day 至少有一个不依赖真实模型的测试。
- 源码必须有中文注释：文件顶部说明学习目标，导出函数说明用途，关键安全边界/协议解析/状态写入/权限判断要解释原因。
- Web day 可以有 `build` 脚本，但 `dist/` 不提交。
- 不跨 day import；允许复制少量 helper 以保持学习隔离。

## 5. 验证与清理

- 修改任意 day 后，至少运行对应 `npm --prefix dayXX-* test`。
- 修改根脚本后运行根目录 `npm test`。
- 修改 Web day 后运行对应 `npm run dayXX:build`，并用 mock 模式打开页面验证非空。
- 不提交 `node_modules`、`dist`、模型权重、日志、临时输出。

## 6. 部署/安全边界

- 远程命令、端口暴露、Docker 部署、服务重启都属于风险操作。
- 学习项目默认只提供 dry-run，不自动执行远程部署。
- remote/shell/local-write 工具默认不执行，只输出审批或 dry-run 结果。
- 不把测试环境 IP、token、密码硬编码到源码逻辑。

## 7. 提交规范

提交信息使用中文，优先：

```text
feat: 扩展 mini-openclaw 三十天学习项目
fix: 修复 dayXX 自包含测试
chore: 整理 mini-openclaw 学习脚本
```
