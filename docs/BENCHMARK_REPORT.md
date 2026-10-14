# SRE 运维与根因定位 Agent 生产级基准评测报告 (100 Historical Fault Tickets)

> **自动生成时间**: `2026-10-14T11:57:24+08:00`  
> **评测样本规模**: `100` 张非重复生产历史故障工单（覆盖 10 大核心故障域 × 每类 10 张变体工单）  
> **运维知识库规模**: `30` 篇高保真 Runbook / SOP / Postmortem 复盘文档（256 维稠密向量 HNSW 图索引 + Okapi BM25 倒排索引）  
> **容器沙箱运行时**: `alpine:3.20` (`--network=none --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m --memory=128m --cpus=0.5 --pids-limit=64 --security-opt=no-new-privileges`)  
> **SHA-256 审计哈希链校验**: `valid=true`（共 `120` 条不可篡改容器执行与安全拦截审计记录）

## 1. 消融实验核心指标总览 (Ablation Study Overview)

本评测对比以下三种递增能力的诊断策略在相同 100 张生产故障工单上的真实表现：

1. **`Baseline-Lexical`**：传统字面词重叠匹配，仅检索工单标题与初始描述，无稠密向量、无 `gre_cli` 观测扩展、无 Docker 沙箱实证。
2. **`RAG-Only (HNSW+BM25)`**：启用 256 维 Subword-JL 稠密向量 HNSW 多层图检索 + Okapi BM25 倒排检索 + RRF（Reciprocal Rank Fusion）重排，但不调用 `gre_cli` 深度指标与 Docker 容器探针验证。
3. **`Full SRE Agent (HNSW+BM25+RRF + Docker Sandbox Verification)`**：完整 SRE ReAct 证据图 Agent，先调用 `gre_cli` 拉取告警、CMDB 跨项目归属（`host project`）、主机监控指标（`host monitoring`）与 NOC SGS 骨干网状态，再通过 HNSW+BM25+RRF 召回候选 Runbook，最后在真实受限 Docker 容器中执行只读诊断探针（`awk`/`grep`）验证原始诊断日志，输出高置信根因结论。

| 评测策略 (Strategy) | Top-1 准确率 | Top-3 准确率 | MRR | Macro Precision | Macro Recall | Macro F1 | P50 耗时 (ms) | P95 耗时 (ms) | P99 耗时 (ms) | 平均 Tokens/单 | 单均成本 (USD) | Docker 沙箱验证数 | 高危指令拦截率 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Baseline-Lexical** | **63.0%** (63/100) | **81.0%** (81/100) | **0.7245** | 0.7312 | 0.6300 | **0.6439** | 0.22 | 2.29 | 5.31 | 294 (P:126/C:168) | $0.001993 | 0/0 | **0.0%** (0/20) |
| **RAG-Only (HNSW+BM25)** | **86.0%** (86/100) | **100.0%** (100/100) | **0.9283** | 0.8631 | 0.8600 | **0.8596** | 0.73 | 5.82 | 6.80 | 361 (P:168/C:194) | $0.002358 | 0/0 | **0.0%** (0/20) |
| **Full SRE Agent (HNSW+BM25+RRF + Docker Sandbox Verification)** | **99.0%** (99/100) | **100.0%** (100/100) | **0.9950** | 0.9909 | 0.9900 | **0.9900** | 7409.71 | 15016.19 | 15016.95 | 1843 (P:913/C:930) | $0.011581 | 82/100 | **100.0%** (20/20) |

## 2. 十大生产故障根因分类明细指标 (Per-Category Precision / Recall / F1)

### 2.1 策略：`Baseline-Lexical`

| 故障根因类别 (Canonical Fault Category) | 样本数 (Support) | TP | FP | FN | Precision | Recall (Top-1) | F1-Score | Top-3 Recall |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `db_orm_tenant_leak` | 10 | 4 | 6 | 6 | 0.4000 | 0.4000 | **0.4000** | 0.6000 |
| `olap_conn_pool_exhaustion` | 10 | 7 | 16 | 3 | 0.3043 | 0.7000 | **0.4242** | 1.0000 |
| `mq_poison_pill_dlq` | 10 | 7 | 2 | 3 | 0.7778 | 0.7000 | **0.7368** | 0.9000 |
| `nat_ip_alert_disambiguation` | 10 | 6 | 1 | 4 | 0.8571 | 0.6000 | **0.7059** | 0.8000 |
| `backbone_bgp_packet_loss` | 10 | 6 | 1 | 4 | 0.8571 | 0.6000 | **0.7059** | 0.7000 |
| `edge_agent_disk_full_circuit_break` | 10 | 10 | 7 | 0 | 0.5882 | 1.0000 | **0.7407** | 1.0000 |
| `auth_replay_and_clock_skew` | 10 | 6 | 0 | 4 | 1.0000 | 0.6000 | **0.7500** | 0.9000 |
| `nsq_early_ack_task_loss` | 10 | 6 | 2 | 4 | 0.7500 | 0.6000 | **0.6667** | 0.7000 |
| `oauth_token_race_overwrite` | 10 | 7 | 2 | 3 | 0.7778 | 0.7000 | **0.7368** | 0.9000 |
| `frontend_memory_leak_oom` | 10 | 4 | 0 | 6 | 1.0000 | 0.4000 | **0.5714** | 0.6000 |
| **Macro-Average / Total** | **100** | **63** | - | - | **0.7312** | **0.6300** | **0.6439** | **0.8100** |

### 2.2 策略：`RAG-Only (HNSW+BM25)`

| 故障根因类别 (Canonical Fault Category) | 样本数 (Support) | TP | FP | FN | Precision | Recall (Top-1) | F1-Score | Top-3 Recall |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `db_orm_tenant_leak` | 10 | 9 | 1 | 1 | 0.9000 | 0.9000 | **0.9000** | 1.0000 |
| `olap_conn_pool_exhaustion` | 10 | 7 | 2 | 3 | 0.7778 | 0.7000 | **0.7368** | 1.0000 |
| `mq_poison_pill_dlq` | 10 | 9 | 2 | 1 | 0.8182 | 0.9000 | **0.8571** | 1.0000 |
| `nat_ip_alert_disambiguation` | 10 | 10 | 0 | 0 | 1.0000 | 1.0000 | **1.0000** | 1.0000 |
| `backbone_bgp_packet_loss` | 10 | 9 | 1 | 1 | 0.9000 | 0.9000 | **0.9000** | 1.0000 |
| `edge_agent_disk_full_circuit_break` | 10 | 9 | 3 | 1 | 0.7500 | 0.9000 | **0.8182** | 1.0000 |
| `auth_replay_and_clock_skew` | 10 | 9 | 2 | 1 | 0.8182 | 0.9000 | **0.8571** | 1.0000 |
| `nsq_early_ack_task_loss` | 10 | 8 | 1 | 2 | 0.8889 | 0.8000 | **0.8421** | 1.0000 |
| `oauth_token_race_overwrite` | 10 | 8 | 1 | 2 | 0.8889 | 0.8000 | **0.8421** | 1.0000 |
| `frontend_memory_leak_oom` | 10 | 8 | 1 | 2 | 0.8889 | 0.8000 | **0.8421** | 1.0000 |
| **Macro-Average / Total** | **100** | **86** | - | - | **0.8631** | **0.8600** | **0.8596** | **1.0000** |

### 2.3 策略：`Full SRE Agent (HNSW+BM25+RRF + Docker Sandbox Verification)`

| 故障根因类别 (Canonical Fault Category) | 样本数 (Support) | TP | FP | FN | Precision | Recall (Top-1) | F1-Score | Top-3 Recall |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `db_orm_tenant_leak` | 10 | 10 | 0 | 0 | 1.0000 | 1.0000 | **1.0000** | 1.0000 |
| `olap_conn_pool_exhaustion` | 10 | 9 | 0 | 1 | 1.0000 | 0.9000 | **0.9474** | 1.0000 |
| `mq_poison_pill_dlq` | 10 | 10 | 0 | 0 | 1.0000 | 1.0000 | **1.0000** | 1.0000 |
| `nat_ip_alert_disambiguation` | 10 | 10 | 0 | 0 | 1.0000 | 1.0000 | **1.0000** | 1.0000 |
| `backbone_bgp_packet_loss` | 10 | 10 | 1 | 0 | 0.9091 | 1.0000 | **0.9524** | 1.0000 |
| `edge_agent_disk_full_circuit_break` | 10 | 10 | 0 | 0 | 1.0000 | 1.0000 | **1.0000** | 1.0000 |
| `auth_replay_and_clock_skew` | 10 | 10 | 0 | 0 | 1.0000 | 1.0000 | **1.0000** | 1.0000 |
| `nsq_early_ack_task_loss` | 10 | 10 | 0 | 0 | 1.0000 | 1.0000 | **1.0000** | 1.0000 |
| `oauth_token_race_overwrite` | 10 | 10 | 0 | 0 | 1.0000 | 1.0000 | **1.0000** | 1.0000 |
| `frontend_memory_leak_oom` | 10 | 10 | 0 | 0 | 1.0000 | 1.0000 | **1.0000** | 1.0000 |
| **Macro-Average / Total** | **100** | **99** | - | - | **0.9909** | **0.9900** | **0.9900** | **1.0000** |

## 3. 架构演进与消融增益归因分析 (Key Engineering Findings)

1. **从 `Baseline-Lexical` 到 `RAG-Only (HNSW+BM25)` 的召回跃升**：
   - 在 Tier-2（同义异词与复合子词症状描述，如未直接出现 Runbook 标题原词的工单）场景下，256 维 Subword 字符 N-Gram 正交随机投影向量（Johnson-Lindenstrauss 变换）配合 HNSW 多层小世界图检索有效捕获了跨表述语义相似性；同时 Okapi BM25 精准锚定错误码与指标名，经 RRF 融合后大幅消除纯字面匹配的漏召回。
2. **从 `RAG-Only` 到 `Full SRE Agent` 的级联故障消歧（Docker 沙箱实证纠偏）**：
   - 在 Tier-3（30% 级联故障与表象混淆型工单）中，工单首屏摘要往往充斥次生症状（例如宿主机 `/tmp` 满触发 1GB 熔断导致下游网关报 `unexpected EOF` 或查询超时；或跨国骨干网 BGP 丢包引发源站 504 告警）。`RAG-Only` 易被表层高频词吸引而将次生现象排在 Top-1、真实根因排在 Top-2/Top-3。
   - `Full SRE Agent` 先通过 `gre_cli` 拉取多维指标，再将 Top 候选 Runbook 的只读诊断探针送入真实受限 Docker 容器（`alpine:3.20`）对原始诊断日志执行定量校验，依据容器 `stdout` 返回的 `VERIFIED:<category>` 实证信号完成根因重排纠偏。
3. **沙箱 AST 安全门禁与不可篡改审计链**：
   - 数据集中 20 张工单夹带了破坏性或越权 `UntrustedUserHint` 载荷（涵盖 `rm -rf`、`dd`、`DROP TABLE`、反弹 Shell、`curl | sh`、`kubectl delete`、`gre_cli host run` 远程写操作及敏感路径读取）。`CommandPolicyGuard` 在进入容器前实现了 **100% 静态拦截**，所有决策与容器执行均记录于 SHA-256 哈希链审计日志中。

## 4. 典型级联混淆工单的真实容器纠偏轨迹示例 (Representative Trace Case Studies)

### 案例 1：工单 `INC-2026-0009`
- **`RAG-Only` Top-1 预测**: `mq_poison_pill_dlq` (Top-3: `[mq_poison_pill_dlq nat_ip_alert_disambiguation db_orm_tenant_leak]`)
- **`Full SRE Agent` 最终预测**: `db_orm_tenant_leak` (置信度: `0.98`, 关联 Runbook: `RB-001`)
- **Docker 沙箱实证输出**: `VERIFIED:db_orm_tenant_leak missing_tenant_where=1`
- **根因结论**: 工单 [INC-2026-0009] 根因定位为 `db_orm_tenant_leak`（关联知识库 `RB-001`，沙箱容器实证=`true`，验证输出=`VERIFIED:db_orm_tenant_leak missing_tenant_where=1`）：GORM 的 db.Where() 返回克隆后的新 *gorm.DB 实例。若业务代码编写了孤立的 `db.Where("tenant_id = ?", tenantID)` 却未将返回值重新赋给 `db = db.Where(...)`，或者复用了未 cloneSession 的全局 baseQuery，后续 `db.Model(&Config{}).Updates(...)` 会丢失租户谓词，退化为跨租户全量更新。

### 案例 2：工单 `INC-2026-0028`
- **`RAG-Only` Top-1 预测**: `nsq_early_ack_task_loss` (Top-3: `[nsq_early_ack_task_loss mq_poison_pill_dlq olap_conn_pool_exhaustion]`)
- **`Full SRE Agent` 最终预测**: `mq_poison_pill_dlq` (置信度: `0.98`, 关联 Runbook: `RB-003`)
- **Docker 沙箱实证输出**: `VERIFIED:mq_poison_pill_dlq WORKER_ERR: panic_recovered=true err="runtime error: index out of range [0] with length 0" pel_delivery_count=1015 xack=false`
- **安全门禁拦截未授信指令**: `Blocked=true` (`Violation=BLOCKED_BINARY_PYTHON3`)
- **根因结论**: 工单 [INC-2026-0028] 根因定位为 `mq_poison_pill_dlq`（关联知识库 `RB-003`，沙箱容器实证=`true`，验证输出=`VERIFIED:mq_poison_pill_dlq WORKER_ERR: panic_recovered=true err="runtime error: index out of range [0] with length 0" pel_delivery_count=1015 xack=false`）：上游投递了缺少 `targets` 数组字段的畸形消息（Poison Pill），消费者解析后直接访问 `msg.Targets[0]` 触发空切片越界 Panic；外层协程的 `defer recover()` 捕获了 Panic 防止进程退出，但未对该消息执行 `XACK` 或转入死信队列（DLQ），导致 `XREADGROUP` / `XAUTOCLAIM` 每次重投同一条毒丸消息，形成无限 Panic 死循环。

### 案例 3：工单 `INC-2026-0050`
- **`RAG-Only` Top-1 预测**: `auth_replay_and_clock_skew` (Top-3: `[auth_replay_and_clock_skew backbone_bgp_packet_loss]`)
- **`Full SRE Agent` 最终预测**: `backbone_bgp_packet_loss` (置信度: `0.98`, 关联 Runbook: `RB-005`)
- **Docker 沙箱实证输出**: `VERIFIED:backbone_bgp_packet_loss NOC_SGS_PANEL: bgp_packet_loss_pct=31.1 cdn_http200_ratio=53.2 rtt_jitter_ms=355.0 as_path_flap=true`
- **根因结论**: 工单 [INC-2026-0050] 根因定位为 `backbone_bgp_packet_loss`（关联知识库 `RB-005`，沙箱容器实证=`true`，验证输出=`VERIFIED:backbone_bgp_packet_loss NOC_SGS_PANEL: bgp_packet_loss_pct=31.1 cdn_http200_ratio=53.2 rtt_jitter_ms=355.0 as_path_flap=true`）：海底光缆或跨国运营商骨干网 BGP AS-Path 发生路由震荡（Route Flapping），流量切换至拥塞备线，导致回源 TCP 握手重传与 TLS 超时断崖式上升，表现为边缘侧 HTTP 200 成功率暴跌而源站内部无异常。

### 案例 4：工单 `INC-2026-0059`
- **`RAG-Only` Top-1 预测**: `olap_conn_pool_exhaustion` (Top-3: `[olap_conn_pool_exhaustion edge_agent_disk_full_circuit_break mq_poison_pill_dlq]`)
- **`Full SRE Agent` 最终预测**: `edge_agent_disk_full_circuit_break` (置信度: `0.98`, 关联 Runbook: `RB-006`)
- **Docker 沙箱实证输出**: `VERIFIED:edge_agent_disk_full_circuit_break tmp_free_mb=700`
- **根因结论**: 工单 [INC-2026-0059] 根因定位为 `edge_agent_disk_full_circuit_break`（关联知识库 `RB-006`，沙箱容器实证=`true`，验证输出=`VERIFIED:edge_agent_disk_full_circuit_break tmp_free_mb=700`）：业务容器或诊断任务将未轮转的调试大日志/core dump 直接写入宿主机挂载的 `/tmp` 分区，导致 `/tmp` 剩余空间跌破边缘 Agent 硬编码的 1GB（1024MB）安全水位线；Agent 自保护机制主动触发写熔断并截断超过 64KB 的本地 Unix Domain Socket IPC 响应。

### 案例 5：工单 `INC-2026-0068`
- **`RAG-Only` Top-1 预测**: `oauth_token_race_overwrite` (Top-3: `[oauth_token_race_overwrite auth_replay_and_clock_skew]`)
- **`Full SRE Agent` 最终预测**: `auth_replay_and_clock_skew` (置信度: `0.98`, 关联 Runbook: `RB-007`)
- **Docker 沙箱实证输出**: `VERIFIED:auth_replay_and_clock_skew skew=-675`
- **安全门禁拦截未授信指令**: `Blocked=true` (`Violation=SENSITIVE_PATH_ACCESS`)
- **根因结论**: 工单 [INC-2026-0068] 根因定位为 `auth_replay_and_clock_skew`（关联知识库 `RB-007`，沙箱容器实证=`true`，验证输出=`VERIFIED:auth_replay_and_clock_skew skew=-675`）：一方面部分边缘机器 `chronyd`/`ntpd` 同步源失效导致系统时钟漂移超过 ±300 秒；另一方面旧版网关中间件在校验 `X-Auth-Timestamp` 时只计算了单向差值 `now - req_ts < 300`（未取绝对值 `abs(now - req_ts)` 且未写入 Redis Nonce 防重放集合），导致未来时间戳或窗口内重放报文绕过拦截。

