# Agent 安全威胁模型

## 资产

- 用户输入、会话上下文、RAG 文档、工具输出、审批记录、运行日志、模型 provider 密钥、远程执行凭据、数据库修复 SQL、事故报告。

## 信任边界

| 边界 | 不可信输入 | 防护 |
|---|---|---|
| User -> API | prompt、附件、URL | schema validation、PII/secret scan、rate limit |
| Model -> Runtime | tool plan、JSON、SQL 草案 | JSON schema、tool allowlist、SQL 只生成不执行 |
| Tool -> Agent | stdout、stderr、HTTP body | output parser、redaction、trust boundary 标记 |
| Agent -> Network | URL、host、method | network allowlist、egress proxy、audit |
| Agent -> File | read/write path | file allowlist、临时 workspace、只读 rootfs |
| Agent -> MCP | endpoint、tool name | `/mcp` initialize、`tools/list`、tool allowlist |
| Release -> Traffic | gray percent、candidate version | canary eval、metrics gate、rollback |

## 主要威胁

- Prompt injection：用户或文档要求忽略系统指令、泄露 token、绕过审批。
- Tool output injection：工具输出伪造指令，诱导模型执行危险动作。
- Secret 泄露：日志、prompt、report 中出现 token、password、private key。
- 权限绕过：Agent 使用 admin cache 或全量资源绕过当前用户权限。
- SSRF / 任意网络访问：模型构造远程 URL 访问内网或外部攻击地址。
- 任意文件读写：读取 `/etc/passwd`、写入源码、覆盖配置或泄露本地文件。
- SQL 风险：模型直接生成并执行 UPDATE/DELETE/DROP。
- MCP 误接入：把 `/health`、`/sse` 或根 URL 当成 MCP 协议入口。
- 发布事故：未经 gate 的 prompt/model/tool/spec 版本进入全量流量。

## 仓库中的防护证据

- day42/day47：权限过滤和权限缓存排障。
- day43/day48：远程命令审批和高危命令阻断。
- day53：SQL 只生成事务草案、`SELECT ... FOR UPDATE` 和 rollback SQL。
- day54：MCP 必须验证 `/mcp`、initialize、`tools/list`。
- day55：复盘质量检查和敏感字段脱敏。
- day57：Runtime 状态机、重试、恢复和 evidence。
- day61：安全沙盒、prompt injection、tool output trust boundary、PII/secret scanning、allowlist 和 audit。
- day63：版本、灰度、canary 和 rollback。

## 安全验收命令

```bash
# 用途：验证安全相关教学案例
# 执行目录：项目根目录
# 结果判断：所有命令 tests passed
# 风险：默认 mock/dry-run，不执行远程命令、不连接数据库、不注册 MCP
npm run day43:test && npm run day48:test && npm run day53:test && npm run day54:test && npm run day55:test && npm run day61:test && npm run day63:test
```
