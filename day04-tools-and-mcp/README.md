# Day 04：工具系统与 MCP 思路

第四天把工具调用从硬编码函数升级成 tool registry，并用 mock MCP adapter 理解“外部能力按协议暴露给 agent”的思路。

## 概念

- tool registry：集中登记工具说明、schema、风险级别和执行函数。
- schema：在代码层校验模型传入的参数。
- permission：read-only、local-write、remote 工具不能混为一谈。
- MCP：用统一协议连接外部工具和资源。

## 运行

```bash
# 用途：列出本地工具注册表
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent
# 输出判断：输出工具名、schema、risk
# 风险：只读
npm run day04:tools -- --list
```

```bash
# 用途：调用 read-only calculator 工具
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent
# 参数含义：--input 是 JSON 对象
# 输出判断：返回计算结果
# 风险：只执行本地安全计算
npm run day04:tools -- --call calculator --input '{"expression":"2+3*4"}'
```

```bash
# 用途：运行工具注册和权限边界测试
# 执行目录：/Users/hongsen.ren/code/github-code/llm-agent
# 输出判断：看到 day04 tests passed
# 风险：不执行真实远程命令
npm run day04:test
```

## 代码入口

- `src/tool-registry.js`：工具注册、schema 校验、风险拦截、mock MCP 输出。
- `src/cli.js`：列工具、调用工具、查看 mock MCP 工具。

## 复盘

权限判断必须在代码层完成，不能只靠 prompt 约束模型“不要调用危险工具”。
