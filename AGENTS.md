# AGENTS.md — `llm-agent` 项目协作与工程规范

本仓库是生产级 Go 语言 **SRE 智能运维诊断与根因定位（RCA）Agent 系统**（Module: `github.com/hongsen/llm-agent`）。

## 1. 环境与工具链

- **Go 版本**：`go 1.23.0`（通过 GVM 管理：`source /Users/hongsen.ren/.gvm/scripts/gvm && gvm use go1.23.0`）。
- **容器运行时**：本地需启动 Docker Daemon，且具备 `alpine:3.20` 镜像，`internal/sandbox` 默认使用真实一次性隔离容器执行只读诊断命令。
- **历史归档分支**：原 75 天 Python/TS 教学脚本已完整保存在 `backup/legacy-75days-mock` 分支，禁止删除或强制覆盖该分支。

## 2. 模块职责边界

- `internal/rag`：
  - `embedder.go`：256 维 Dense 向量嵌入器（支持 `OPENAI_API_KEY` 在线 API 与确定性本地 Subword N-Gram + JL 随机投影双模）。
  - `hnsw.go`：纯 Go 多层 HNSW 图索引（余弦距离、增量插入、多层贪婪搜索、JSON 序列化）。
  - `bm25.go`：Okapi BM25 倒排索引与 SRE 技术标识符分词器。
  - `hybrid.go`：Reciprocal Rank Fusion (RRF) 混合检索器。
  - `corpus.go`：10 大 SRE 故障类别、30 篇生产级 Runbook/Postmortem/SOP 知识库。
- `internal/sandbox`：
  - `policy.go`：AST 级词法白名单守卫 `CommandPolicyGuard`，仅允许 16 个只读分析二进制，拦截命令链、重定向、网络外联与敏感路径。
  - `docker.go`：真实 Docker 隔离沙箱（`--network=none --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m --memory=128m --cpus=0.5 --pids-limit=64 --security-opt=no-new-privileges`）与 SHA-256 哈希链审计日志。
- `internal/grecli`：
  - `contract.go`：对齐 `gre_cli` 的 `ResponseEnvelope`、退出码契约（`0/2/12/20`）、敏感凭据脱敏器及 `gre_http`/`gre_mysql`/`gre_redis`/`gre_log` 诊断工具。
- `internal/agent`：
  - `tokenizer.go`：`cl100k_base` 兼容 BPE 切词器与 Token/USD 成本统计。
  - `react.go`：多步 ReAct 证据图推理循环与 Docker 沙箱量化消歧。
- `internal/eval`：
  - `dataset.go`：100 条非重复历史故障工单基准生成器。
  - `runner.go`：3 策略消融评测执行器与恶意命令注入拦截验证。
  - `report.go`：`docs/BENCHMARK_REPORT.md` 自动化报告生成。

## 3. 验证与评测命令

```bash
# 运行全部单元测试与真实 Docker 沙箱测试
go test -v -race ./...

# 单工单根因诊断
go run ./cmd/sre-agent --ticket-id INC-2026-0059 --json

# 运行 100 条历史故障工单 3 策略消融评测
go run ./cmd/benchmark --concurrency 8 --out-dir .
```

## 4. 编码与注释要求

- 新增或修改任何结构体、方法、检索算子、安全策略、ReAct 推理分支时，必须同步补充清晰的中文注释，说明设计原因与边界语义。
- 构建二进制产物时输出至 `/tmp`，禁止将编译后的可执行文件提交到源码根目录。
