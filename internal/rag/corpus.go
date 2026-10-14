package rag

// CanonicalFaultCategories 定义 GPMM/GNM/CCU/Bee/Bulldog 10 大生产故障根因的标准分类枚举。
var CanonicalFaultCategories = []string{
	"db_orm_tenant_leak",
	"olap_conn_pool_exhaustion",
	"mq_poison_pill_dlq",
	"nat_ip_alert_disambiguation",
	"backbone_bgp_packet_loss",
	"edge_agent_disk_full_circuit_break",
	"auth_replay_and_clock_skew",
	"nsq_early_ack_task_loss",
	"oauth_token_race_overwrite",
	"frontend_memory_leak_oom",
}

// DefaultSREKnowledgeCorpus 构建生产级 SRE 运维知识库（共 30 篇高保真 Runbook / SOP / Postmortem 复盘文档，
// 覆盖 10 大故障域的标准排障手册、gre_cli 诊断契约、Docker 沙箱探针脚本与历史复盘案例）。
func DefaultSREKnowledgeCorpus() []KnowledgeDocument {
	return []KnowledgeDocument{
		// ==================== 1. db_orm_tenant_leak ====================
		{
			ID:               "RB-001",
			Category:         "db_orm_tenant_leak",
			Title:            "Runbook: GORM 链式调用丢弃返回值导致多租户配置跨项目误刷诊断与恢复",
			SymptomSummary:   "多业务线配置同步接口调用后，非目标租户（project/tenant_id）的配置项被批量覆写；MySQL slowlog/binlog 出现缺少 tenant_id 过滤条件的 UPDATE 语句，rows_affected 异常偏大。",
			RootCausePattern: "GORM 的 db.Where() 返回克隆后的新 *gorm.DB 实例。若业务代码编写了孤立的 `db.Where(\"tenant_id = ?\", tenantID)` 却未将返回值重新赋给 `db = db.Where(...)`，或者复用了未 cloneSession 的全局 baseQuery，后续 `db.Model(&Config{}).Updates(...)` 会丢失租户谓词，退化为跨租户全量更新。",
			GreCLICommands: []string{
				"gre_cli event list --project gpmm --keyword tenant",
				"gre_cli job audit --project gpmm",
				"gre_cli host monitoring query --metric mysql_rows_updated_total",
			},
			SandboxProbeScript: `grep -E "UPDATE .* SET" "$TELEMETRY_FILE" | awk '!/tenant_id/ {missing++} END {if (missing>0) print "VERIFIED:db_orm_tenant_leak missing_tenant_where=" missing; else print "UNMATCHED"}'`,
			RemediationSOP:     "1. 立即冻结配置中心写接口并从 binlog2sql 生成反向回滚 SQL；2. 将所有 `db.Where(...)` 改为显式赋值 `tx = tx.Where(...)` 并启用 GORM `ErrMissingWhereClause` 全局保护；3. 增加单元测试断言 SQL 必须包含 `tenant_id = ?`。",
			Tags:               []string{"gorm", "mysql", "tenant_id", "where", "chain", "multi-tenant", "binlog", "gpmm"},
		},
		{
			ID:               "PM-001",
			Category:         "db_orm_tenant_leak",
			Title:            "Postmortem: GPMM 告警静默规则跨业务串台事故复盘（GORM Session 污染）",
			SymptomSummary:   "用户在 A 业务后台修改单条告警静默策略后，B/C/D 等 12 个业务线的同名规则同时被静默，审计日志仅记录单次 API 请求，但变更行数达 480 行。",
			RootCausePattern: "Repository 层在 if 分支内调用了 `query.Where(\"project_id = ?\", req.ProjectID)` 未接收返回值，导致生成的 SQL 缺少租户隔离条件。",
			GreCLICommands: []string{
				"gre_cli alert list",
				"gre_cli event get EVT-GORM-LEAK",
			},
			SandboxProbeScript: `grep -E "rows_affected=[0-9]+" "$TELEMETRY_FILE" | grep -i "gorm_discard_where=true" >/dev/null && echo "VERIFIED:db_orm_tenant_leak"`,
			RemediationSOP:     "引入自定义 GORM Callback 强制校验多租户表的 UPDATE/DELETE 必须携带 tenant_id/project_id 过滤。",
			Tags:               []string{"postmortem", "gorm", "session", "project_id", "rows_affected"},
		},
		{
			ID:               "SOP-001",
			Category:         "db_orm_tenant_leak",
			Title:            "SOP: ORM 多租户隔离失效 SQL 审计与沙箱日志静态取证规范",
			SymptomSummary:   "数据库写入突增、不同项目参数变成相同值、配置下发越权覆盖。",
			RootCausePattern: "ORM 链式构建器不可变引用被忽略，导致 WHERE 子句缺失 tenant_id。",
			GreCLICommands: []string{
				"gre_cli job history --project gpmm --search config_sync",
			},
			SandboxProbeScript: `awk '/SQL_TRACE/ && /UPDATE/ && !/tenant_id/ {print "VERIFIED:db_orm_tenant_leak"}' "$TELEMETRY_FILE"`,
			RemediationSOP:     "通过沙箱提取 SQL_TRACE 日志，核对 UPDATE 语句谓词完整性，使用事务回滚脚本恢复误刷记录。",
			Tags:               []string{"sop", "sql_trace", "orm", "tenant"},
		},

		// ==================== 2. olap_conn_pool_exhaustion ====================
		{
			ID:               "RB-002",
			Category:         "olap_conn_pool_exhaustion",
			Title:            "Runbook: ClickHouse 高并发小事务未 Rollback 导致 OLAP 连接池耗尽排障指南",
			SymptomSummary:   "报表与监控聚合接口大面积返回 `sql: database is closed` 或 `acquire connection timeout: max_open_conns reached`，ClickHouse 服务端 `TCPConnection` 指标打满，但 CPU 利用率不足 15%。",
			RootCausePattern: "业务代码在高频查询或参数校验提前 return 分支中开启了 `db.BeginTx(ctx, nil)`，在遇到参数错误或超时 return 时未执行 `defer tx.Rollback()`，导致底层 `*sql.Conn` 长期被挂起的空闲事务独占，无法归还到 `database/sql` 连接池，迅速耗尽 `MaxOpenConns`。",
			GreCLICommands: []string{
				"gre_cli host monitoring query --metric clickhouse_tcp_connections,go_sql_in_use_connections",
				"gre_cli chart data --id ch-conn-pool",
			},
			SandboxProbeScript: `awk '/tx_opened=/ {split($0,a,"tx_opened="); split(a[2],b," "); open=b[1]} /tx_closed=/ {split($0,c,"tx_closed="); split(c[2],d," "); close=d[1]} END {if (open-close > 50) print "VERIFIED:olap_conn_pool_exhaustion leaked_tx=" (open-close); else print "UNMATCHED"}' "$TELEMETRY_FILE"`,
			RemediationSOP:     "1. 紧急滚动重启泄漏的查询网关实例释放悬挂连接；2. 在所有 `BeginTx` 紧邻下一行补齐 `defer func() { _ = tx.Rollback() }()`；3. 将小批量写入合并为异步 Batch 写入，配置合理的 `SetConnMaxLifetime`。",
			Tags:               []string{"clickhouse", "olap", "connection_pool", "rollback", "max_open_conns", "leak", "tx"},
		},
		{
			ID:               "PM-002",
			Category:         "olap_conn_pool_exhaustion",
			Title:            "Postmortem: CCU 实时分析大盘超时雪崩复盘（ClickHouse 连接泄漏）",
			SymptomSummary:   "大盘图表查询 P99 延迟从 120ms 飙升至 10000ms 超时，`go_sql_stats_connections_in_use` 恒等于上限 200，`wait_count` 每秒递增上千。",
			RootCausePattern: "高频微批写入协程在重试分支遗漏 `tx.Rollback()`，每次部分失败均永久泄漏 1 个连接。",
			GreCLICommands: []string{
				"gre_cli chart grafana",
				"gre_cli host monitoring query --metric go_sql_stats_connections_in_use",
			},
			SandboxProbeScript: `grep -E "in_use=200.*max_open=200" "$TELEMETRY_FILE" >/dev/null && echo "VERIFIED:olap_conn_pool_exhaustion"`,
			RemediationSOP:     "统一封装 `WithTransaction(ctx, db, fn)` 闭包管理生命周期，禁止业务层裸调 `BeginTx`。",
			Tags:               []string{"ccu", "clickhouse", "in_use", "wait_count", "begin_tx"},
		},
		{
			ID:               "SOP-002",
			Category:         "olap_conn_pool_exhaustion",
			Title:            "SOP: OLAP 数据库连接池满与未归还事务连接定位流程",
			SymptomSummary:   "数据库连接数满但无慢查询，活跃线程处于 Idle in transaction 状态。",
			RootCausePattern: "异常退出路径未调用 Rollback 释放连接句柄。",
			GreCLICommands: []string{
				"gre_cli host monitoring metrics",
			},
			SandboxProbeScript: `grep -i "unclosed_tx_conn" "$TELEMETRY_FILE" >/dev/null && echo "VERIFIED:olap_conn_pool_exhaustion"`,
			RemediationSOP:     "对比 `tx_opened` 与 `tx_committed + tx_rolled_back` 差值确认泄漏速率。",
			Tags:               []string{"sop", "olap", "conn_leak"},
		},

		// ==================== 3. mq_poison_pill_dlq ====================
		{
			ID:               "RB-003",
			Category:         "mq_poison_pill_dlq",
			Title:            "Runbook: Redis Stream 毒丸消息触发空切片 Panic 吞没与 PEL 堆积排障",
			SymptomSummary:   "异步告警分发或事件消费队列停滞，Redis Stream 的 Pending Entries List (PEL) 持续增长，消费者进程存活且无重启，但错误日志周期性打印 `runtime error: index out of range [0] with length 0`。",
			RootCausePattern: "上游投递了缺少 `targets` 数组字段的畸形消息（Poison Pill），消费者解析后直接访问 `msg.Targets[0]` 触发空切片越界 Panic；外层协程的 `defer recover()` 捕获了 Panic 防止进程退出，但未对该消息执行 `XACK` 或转入死信队列（DLQ），导致 `XREADGROUP` / `XAUTOCLAIM` 每次重投同一条毒丸消息，形成无限 Panic 死循环。",
			GreCLICommands: []string{
				"gre_cli alert list",
				"gre_cli host monitoring query --metric redis_stream_pending_messages",
			},
			SandboxProbeScript: `awk '/index out of range|slice bounds out of range/ && /pel_delivery_count=/ {print "VERIFIED:mq_poison_pill_dlq " $0}' "$TELEMETRY_FILE"`,
			RemediationSOP:     "1. 通过 `XPENDING` 定位投递次数 `delivery_count > 5` 的毒丸消息 ID，转存至 DLQ Stream 后执行 `XACK` 恢复队列流转；2. 在消费者入口增加 Schema 校验与空切片边界检查；3. 在 `recover()` 分支引入最大重试阈值（超限自动入 DLQ 并 XACK）。",
			Tags:               []string{"redis", "stream", "xreadgroup", "pel", "dlq", "poison_pill", "panic", "empty_slice"},
		},
		{
			ID:               "PM-003",
			Category:         "mq_poison_pill_dlq",
			Title:            "Postmortem: QueenBee 作业回调通知卡死事故（Redis Stream PEL 死循环）",
			SymptomSummary:   "消费者组 lag 飙升至 5 万条，单条消息 `delivery_count` 超过 1200 次，Worker CPU 空转。",
			RootCausePattern: "空 payload 触发切片下标越界被顶层 middleware 静默 recover，未执行 XACK 也未隔离至死信队列。",
			GreCLICommands: []string{
				"gre_cli job history --project queenbee",
				"gre_cli event list --keyword stream",
			},
			SandboxProbeScript: `awk '/pel_pending=/ && /panic_recovered=/ {print "VERIFIED:mq_poison_pill_dlq"}' "$TELEMETRY_FILE"`,
			RemediationSOP:     "建立死信队列自动驱逐策略（MaxDeliveries = 3）与毒丸告警监控。",
			Tags:               []string{"queenbee", "redis_stream", "xack", "recover"},
		},
		{
			ID:               "SOP-003",
			Category:         "mq_poison_pill_dlq",
			Title:            "SOP: 消息队列 PEL 阻塞与消费者 Panic 吞没诊断手册",
			SymptomSummary:   "消费速率归零但消费者 Pod 未重启，日志存在 recover stacktrace。",
			RootCausePattern: "畸形消息引发空切片越界且 recover 后未推进消费位点。",
			GreCLICommands: []string{
				"gre_cli host monitoring query --metric mq_consumer_lag",
			},
			SandboxProbeScript: `grep -i "poison_pill_id=" "$TELEMETRY_FILE" >/dev/null && echo "VERIFIED:mq_poison_pill_dlq"`,
			RemediationSOP:     "沙箱解析 XPENDING 快照，提取高重投次数消息 ID 并执行死信隔离。",
			Tags:               []string{"sop", "mq", "dlq"},
		},

		// ==================== 4. nat_ip_alert_disambiguation ====================
		{
			ID:               "RB-004",
			Category:         "nat_ip_alert_disambiguation",
			Title:            "Runbook: 多项目共用云 NAT 出口 IP 导致外部告警归属错乱与消歧排障",
			SymptomSummary:   "第三方云商或安全网关针对公网出口 EIP（SNAT IP）触发流量异常/高频请求告警，告警单默认挂载在字母序首个项目（如业务 A）名下，但业务 A 内部主机流量完全平稳。",
			RootCausePattern: "多个 COW/GPMM 业务项目的主机位于同一云 VPC 私网子网，共用同一个公网 NAT 网关出口 IP。外部告警仅携带公网 NAT IP，告警路由按 `host project <IP>` 列表的首个命中项目静态绑定，未结合 SNAT 端口映射五元组与各项目内网主机出向带宽时序进行二次消歧。",
			GreCLICommands: []string{
				"gre_cli host project <NAT_EIP>",
				"gre_cli host search --ip <NAT_EIP>",
				"gre_cli host monitoring query --metric net_out_bytes_per_sec",
			},
			SandboxProbeScript: `awk '/shared_nat_eip=true/ && /actual_culprit_project=/ {print "VERIFIED:nat_ip_alert_disambiguation " $0}' "$TELEMETRY_FILE"`,
			RemediationSOP:     "1. 执行 `gre_cli host project <EIP>` 获取共享该出口 IP 的全部候选项目列表；2. 拉取各候选项目下内网主机的 `net_out_bytes_per_sec` 与 `conntrack_established` 突增曲线，定位真实肇事主机与所属项目；3. 将告警聚合层升级为基于流量突变相关系数的动态项目归属消歧。",
			Tags:               []string{"nat", "snat", "eip", "host_project", "cmdb", "disambiguation", "shared_ip", "alert_routing"},
		},
		{
			ID:               "PM-004",
			Category:         "nat_ip_alert_disambiguation",
			Title:            "Postmortem: 公网 NAT 网关 IP 告警误呼值班团队复盘",
			SymptomSummary:   "某公网 IP 触发出向连接数激增告警，被分派给基础平台组，排查 40 分钟后发现实际是同 VPC 下另一游戏业务爬虫任务所致。",
			RootCausePattern: "`host project` 查询该 EIP 返回 4 个授权项目，旧版告警规则直接取 index 0 项目而不对比内网主机流量。",
			GreCLICommands: []string{
				"gre_cli host project 203.0.113.88",
				"gre_cli oncall phones",
			},
			SandboxProbeScript: `grep -E "shared_projects_count=[2-9]" "$TELEMETRY_FILE" >/dev/null && echo "VERIFIED:nat_ip_alert_disambiguation"`,
			RemediationSOP:     "当 `host project` 命中项目数 > 1 时，强制触发跨项目主机流量对齐探针。",
			Tags:               []string{"postmortem", "nat_eip", "oncall", "host_project"},
		},
		{
			ID:               "SOP-004",
			Category:         "nat_ip_alert_disambiguation",
			Title:            "SOP: 共享 EIP/NAT 网关告警跨业务消歧标准操作流程",
			SymptomSummary:   "告警 IP 在 CMDB 中关联多个业务线，被告警项目无对应业务流量波动。",
			RootCausePattern: "多租户共享 SNAT 出口 IP 导致单一 IP 无法唯一标识项目归属。",
			GreCLICommands: []string{
				"gre_cli host project",
				"gre_cli host topology json",
			},
			SandboxProbeScript: `grep -i "nat_gateway_shared" "$TELEMETRY_FILE" >/dev/null && echo "VERIFIED:nat_ip_alert_disambiguation"`,
			RemediationSOP:     "通过沙箱比对各候选项目主机在同一时间窗的出向包速率峰值完成精确定责。",
			Tags:               []string{"sop", "nat", "cmdb"},
		},

		// ==================== 5. backbone_bgp_packet_loss ====================
		{
			ID:               "RB-005",
			Category:         "backbone_bgp_packet_loss",
			Title:            "Runbook: 跨国骨干网专线丢包抖动与 CDN HTTP 200 成功率暴跌联合诊断",
			SymptomSummary:   "海外大区（如 SG->BR 或 SG->ID）边缘 CDN 节点 HTTP 200 状态码占比在 3 分钟内从 99.8% 暴跌至 62%，源站应用服务器 CPU/内存/DB 均正常，但 NOC SGS 面板显示跨国骨干专线丢包率 > 18%、RTT 抖动 > 240ms。",
			RootCausePattern: "海底光缆或跨国运营商骨干网 BGP AS-Path 发生路由震荡（Route Flapping），流量切换至拥塞备线，导致回源 TCP 握手重传与 TLS 超时断崖式上升，表现为边缘侧 HTTP 200 成功率暴跌而源站内部无异常。",
			GreCLICommands: []string{
				"gre_cli noc sgs panels",
				"gre_cli noc sgs query --panel backbone_packet_loss",
				"gre_cli chart ff-mtr",
				"gre_cli event impact-business-regions <EVENT_ID>",
			},
			SandboxProbeScript: `awk '/bgp_packet_loss_pct=/ && /cdn_http200_ratio=/ {print "VERIFIED:backbone_bgp_packet_loss " $0}' "$TELEMETRY_FILE"`,
			RemediationSOP:     "1. 通过 `gre_cli noc sgs query` 与 `chart ff-mtr` 确认丢包跳点所属运营商 AS 号；2. 联动 NOC 团队执行 BGP Community 流量工程调度，将回源流量切往低丢包绕行专线；3. 临时调大边缘节点回源 KeepAlive 连接复用池。",
			Tags:               []string{"bgp", "mtr", "packet_loss", "jitter", "backbone", "cdn", "http_200", "noc_sgs"},
		},
		{
			ID:               "PM-005",
			Category:         "backbone_bgp_packet_loss",
			Title:            "Postmortem: 东南亚至拉美跨国专线 BGP 震荡引发登录成功率下跌复盘",
			SymptomSummary:   "CDN 200 状态码跌落伴随 502/504 激增，源站 Pod 零报错，MTR 第 6 跳国际出口丢包 25%。",
			RootCausePattern: "一级运营商骨干路由收敛异常导致跨境专线拥塞丢包。",
			GreCLICommands: []string{
				"gre_cli noc sgs range --panel sgs_cdn_status_200",
				"gre_cli ddos summary",
			},
			SandboxProbeScript: `grep -E "mtr_hop_loss_pct=[1-9][0-9]" "$TELEMETRY_FILE" >/dev/null && echo "VERIFIED:backbone_bgp_packet_loss"`,
			RemediationSOP:     "配置基于实时 MTR 丢包率的自动 GTM/Anycast 线路切换策略。",
			Tags:               []string{"postmortem", "bgp", "cdn_200", "mtr"},
		},
		{
			ID:               "SOP-005",
			Category:         "backbone_bgp_packet_loss",
			Title:            "SOP: 区分源站应用故障与骨干网 BGP 链路丢包的黄金诊断准则",
			SymptomSummary:   "外部拨测与 CDN 200 状态码暴跌，但源站本地健康检查 100% 正常。",
			RootCausePattern: "广域网骨干传输层丢包导致长肥管道（LFN）TCP 吞吐崩溃。",
			GreCLICommands: []string{
				"gre_cli noc sgs query --panel mtr_backbone_jitter",
			},
			SandboxProbeScript: `grep -i "as_path_flap=true" "$TELEMETRY_FILE" >/dev/null && echo "VERIFIED:backbone_bgp_packet_loss"`,
			RemediationSOP:     "优先核查 NOC SGS 与 FF-MTR 面板，切勿盲目重启源站容器。",
			Tags:               []string{"sop", "noc", "backbone"},
		},

		// ==================== 6. edge_agent_disk_full_circuit_break ====================
		{
			ID:               "RB-006",
			Category:         "edge_agent_disk_full_circuit_break",
			Title:            "Runbook: 宿主机大日志撑爆 /tmp 触发边缘 Agent 1GB 熔断与 IPC 截断排障",
			SymptomSummary:   "宿主机管控 Agent（Bee/Collie Edge Agent）批量上报心跳异常或远程任务返回 `IPC payload truncated / circuit breaker open: /tmp free space below 1024MB`，执行 `host run` 失败。",
			RootCausePattern: "业务容器或诊断任务将未轮转的调试大日志/core dump 直接写入宿主机挂载的 `/tmp` 分区，导致 `/tmp` 剩余空间跌破边缘 Agent 硬编码的 1GB（1024MB）安全水位线；Agent 自保护机制主动触发写熔断并截断超过 64KB 的本地 Unix Domain Socket IPC 响应。",
			GreCLICommands: []string{
				"gre_cli host search",
				"gre_cli host run status <TASK_ID>",
				"gre_cli host monitoring query --metric disk_tmp_free_mb",
			},
			SandboxProbeScript: `awk '/tmp_free_mb=/ {split($0,a,"tmp_free_mb="); split(a[2],b," "); if (b[1]+0 < 1024) print "VERIFIED:edge_agent_disk_full_circuit_break tmp_free_mb=" b[1]}' "$TELEMETRY_FILE"`,
			RemediationSOP:     "1. 清理 `/tmp` 下超过 24 小时未修改的临时转储文件（注意遵循只读核查后清理规范，检查 `lsof +L1 /tmp` 释放已删除但仍被进程占用的 fd）；2. 将业务调试日志迁移至独立挂载且配了 logrotate 的数据盘；3. 恢复 `/tmp` 剩余空间 > 1GB 后 Agent 自动解除熔断。",
			Tags:               []string{"/tmp", "disk_full", "1gb", "1024mb", "circuit_break", "ipc", "truncate", "edge_agent", "enospc"},
		},
		{
			ID:               "PM-006",
			Category:         "edge_agent_disk_full_circuit_break",
			Title:            "Postmortem: 宿主机 /tmp 目录满触发管控通道熔断与 IPC 截断复盘",
			SymptomSummary:   "多台物理机同时失联，Agent 日志提示 `circuit_break_reason=tmp_avail_below_1024mb`，IPC 报文在 65536 字节处被截断导致 JSON 反序列化失败。",
			RootCausePattern: "遗留抓包脚本在 `/tmp` 生成数个 8GB pcap 文件，触发 Agent 1GB 磁盘水位熔断保护。",
			GreCLICommands: []string{
				"gre_cli host log <TASK_ID>",
				"gre_cli inventory query",
			},
			SandboxProbeScript: `grep -E "circuit_breaker=OPEN.*threshold_mb=1024" "$TELEMETRY_FILE" >/dev/null && echo "VERIFIED:edge_agent_disk_full_circuit_break"`,
			RemediationSOP:     "为定时诊断任务增加 `--tmpfs` 容量上限与退出自动清理 trap。",
			Tags:               []string{"postmortem", "tmp_disk", "ipc_truncate", "agent_circuit_break"},
		},
		{
			ID:               "SOP-006",
			Category:         "edge_agent_disk_full_circuit_break",
			Title:            "SOP: 边缘 Agent 1GB 磁盘水位熔断与 unlinked 大文件排查规程",
			SymptomSummary:   "df 显示 /tmp 使用率高或剩余不足 1024MB，Agent 拒绝下发任务。",
			RootCausePattern: "/tmp 可用空间低于 1024MB 硬保护阈值。",
			GreCLICommands: []string{
				"gre_cli host monitoring query --metric disk_used_percent",
			},
			SandboxProbeScript: `grep -i "ipc_truncated_1gb_guard" "$TELEMETRY_FILE" >/dev/null && echo "VERIFIED:edge_agent_disk_full_circuit_break"`,
			RemediationSOP:     "检查 `/tmp` 容量及句柄泄漏，恢复水位后验证 Agent 状态。",
			Tags:               []string{"sop", "disk", "agent"},
		},

		// ==================== 7. auth_replay_and_clock_skew ====================
		{
			ID:               "RB-007",
			Category:         "auth_replay_and_clock_skew",
			Title:            "Runbook: 堡垒机/API 网关时间戳过期未拦截与宿主机时钟漂移（Clock Skew）排障",
			SymptomSummary:   "Bulldog 堡垒机或 API 网关出现两类鉴权异常：一是部分宿主机发起的签名请求报 `signature timestamp skew exceeded` 401/403；二是安全审计告警发现过期超过 15 分钟的历史签名包仍能穿透旧版节点触发重放告警。",
			RootCausePattern: "一方面部分边缘机器 `chronyd`/`ntpd` 同步源失效导致系统时钟漂移超过 ±300 秒；另一方面旧版网关中间件在校验 `X-Auth-Timestamp` 时只计算了单向差值 `now - req_ts < 300`（未取绝对值 `abs(now - req_ts)` 且未写入 Redis Nonce 防重放集合），导致未来时间戳或窗口内重放报文绕过拦截。",
			GreCLICommands: []string{
				"gre_cli event list --project bulldog --keyword replay",
				"gre_cli host monitoring query --metric node_timex_offset_seconds",
			},
			SandboxProbeScript: `awk '/clock_skew_sec=/ {split($0,a,"clock_skew_sec="); split(a[2],b," "); v=b[1]+0; if (v>300 || v<-300) print "VERIFIED:auth_replay_and_clock_skew skew=" v} /replay_nonce_hit=true/ {print "VERIFIED:auth_replay_and_clock_skew nonce_replay"}' "$TELEMETRY_FILE"`,
			RemediationSOP:     "1. 修复异常主机的内网 NTP 授时源并强制同步硬件时钟；2. 网关鉴权中间件统一校验 `math.Abs(serverNow - reqTimestamp) <= 300` 并结合 `(signature, nonce)` 5 分钟 TTL 原子去重。",
			Tags:               []string{"bastion", "bulldog", "clock_skew", "ntp", "timestamp", "replay", "nonce", "signature"},
		},
		{
			ID:               "PM-007",
			Category:         "auth_replay_and_clock_skew",
			Title:            "Postmortem: Bulldog 堡垒机鉴权签名重放与 NTP 时钟偏移故障复盘",
			SymptomSummary:   "安全巡检发现堡垒机握手请求中存在时间戳偏移 900 秒的异常会话，同时多台跳板机因时钟慢 380 秒无法建立 SSH 隧道。",
			RootCausePattern: "NTP 守护进程挂死引发宿主机时钟漂移，叠加网关时间戳绝对值校验缺失。",
			GreCLICommands: []string{
				"gre_cli host search --keyword bastion",
				"gre_cli event get EVT-AUTH-SKEW",
			},
			SandboxProbeScript: `grep -E "auth_skew_check_failed|replay_window_bypass" "$TELEMETRY_FILE" >/dev/null && echo "VERIFIED:auth_replay_and_clock_skew"`,
			RemediationSOP:     "启用 chrony 偏移监控告警（阈值 > 5s）并全量升级网关防重放插件。",
			Tags:               []string{"postmortem", "bulldog", "ntp", "replay"},
		},
		{
			ID:               "SOP-007",
			Category:         "auth_replay_and_clock_skew",
			Title:            "SOP: API 网关 HMAC 时间戳校验与防重放 Nonce 审计规范",
			SymptomSummary:   "偶发 401 Signature Expired 或安全中心提示重放攻击告警。",
			RootCausePattern: "客户端与服务端时钟不同步（Clock Skew）或 Nonce 去重失效。",
			GreCLICommands: []string{
				"gre_cli host monitoring query --metric ntp_offset_ms",
			},
			SandboxProbeScript: `grep -i "timestamp_skew" "$TELEMETRY_FILE" >/dev/null && echo "VERIFIED:auth_replay_and_clock_skew"`,
			RemediationSOP:     "在沙箱中比对请求头 `X-Timestamp` 与网关接收时间戳差值。",
			Tags:               []string{"sop", "auth", "clock_skew"},
		},

		// ==================== 8. nsq_early_ack_task_loss ====================
		{
			ID:               "RB-008",
			Category:         "nsq_early_ack_task_loss",
			Title:            "Runbook: NSQ Worker 提前 Finish ACK 在容器 OOM 重启时静默丢失发布任务排障",
			SymptomSummary:   "发布系统或异步作业中心显示任务已投递成功（NSQ 队列积压为 0 且无重入队记录），但目标集群从未收到部署指令；对应时间点 Worker 容器发生过 `OOMKilled (ExitCode 137)` 重启。",
			RootCausePattern: "NSQ 消费者 Handler 为避免长耗时发布任务触发 NSQ 默认 `msg-timeout` 重投，在收到消息的第一行就提前调用了 `msg.Finish()` 发送 ACK，随后才在内存里执行耗时的构建/发布逻辑。当容器在执行中途因内存峰值被内核 Cgroup OOM Killer 强杀（SIGKILL/137）时，NSQd 早已销毁该消息，导致任务永久静默丢失。",
			GreCLICommands: []string{
				"gre_cli job history --project gpmm",
				"gre_cli job result --project gpmm <TASK_ID> <HISTORY_ID> --detail",
				"gre_cli host monitoring query --metric container_oom_events_total",
			},
			SandboxProbeScript: `awk '/nsq_fin_ack_ts=/ && /oom_killed_exit_137_ts=/ {print "VERIFIED:nsq_early_ack_task_loss " $0}' "$TELEMETRY_FILE"`,
			RemediationSOP:     "1. 严禁在任务完成前调用 `msg.Finish()`；2. 改为启动后台 goroutine 定期调用 `msg.Touch()` 延长 NSQ in-flight 租约，仅在业务落库并确认完成后才调用 `msg.Finish()`；3. 为发布任务引入数据库状态机对账补偿。",
			Tags:               []string{"nsq", "early_ack", "finish", "touch", "oom", "oomkilled", "exit_137", "task_loss"},
		},
		{
			ID:               "PM-008",
			Category:         "nsq_early_ack_task_loss",
			Title:            "Postmortem: 异步发布 Worker OOMKilled 导致 14 个子任务蒸发事故复盘",
			SymptomSummary:   "发布单永远停留在 Running 状态，NSQ 监控显示 `in_flight=0, deferred=0`，Pod 事件显示 `Reason: OOMKilled`。",
			RootCausePattern: "Handler 入口提前执行 `msg.Finish()`（Early ACK），随后拉取大镜像元数据触发 OOM，消息失去重投机会。",
			GreCLICommands: []string{
				"gre_cli job audit --project gpmm",
				"gre_cli event list --keyword nsq",
			},
			SandboxProbeScript: `grep -E "ack_before_exec=true.*exit_code=137" "$TELEMETRY_FILE" >/dev/null && echo "VERIFIED:nsq_early_ack_task_loss"`,
			RemediationSOP:     "废除提前 ACK 逻辑，使用 `msg.DisableAutoResponse()` + 周期 `Touch()` 保活 + 结项 `Finish()`。",
			Tags:               []string{"postmortem", "nsq", "oomkilled", "early_ack"},
		},
		{
			ID:               "SOP-008",
			Category:         "nsq_early_ack_task_loss",
			Title:            "SOP: NSQ 消费者 At-Least-Once 投递保障与 OOM 任务丢失核查步骤",
			SymptomSummary:   "消息已 ACK 但下游无执行记录，伴随容器内存超限重启。",
			RootCausePattern: "先 ACK 后执行的反模式在进程非正常终止时破坏至少一次语义。",
			GreCLICommands: []string{
				"gre_cli job result --project gpmm",
			},
			SandboxProbeScript: `grep -i "nsq_early_finish" "$TELEMETRY_FILE" >/dev/null && echo "VERIFIED:nsq_early_ack_task_loss"`,
			RemediationSOP:     "核对 `nsq_fin_ack_ts < task_complete_ts` 及容器 OOM 时间戳。",
			Tags:               []string{"sop", "nsq", "at_least_once"},
		},

		// ==================== 9. oauth_token_race_overwrite ====================
		{
			ID:               "RB-009",
			Category:         "oauth_token_race_overwrite",
			Title:            "Runbook: 多进程 CLI 并发刷新 OAuth2 Token 导致 config.yaml 覆写与 401 排障",
			SymptomSummary:   "Crontab 或 CI 流水线并发启动多个 `gre_cli` 进程时，大批命令偶发报错 `401 Unauthorized: invalid or revoked access_token` 或 `yaml: unmarshal errors: unexpected EOF`。",
			RootCausePattern: "多个 CLI 进程同时检测到本地 `~/.gre_cli/config.yaml` 中的 `access_token` 即将过期，各自并发调用 `/oauth/token` 刷新（服务端签发新 Token 时自动吊销旧 Token），且各进程直接以 `os.O_WRONLY|os.O_TRUNC` 裸写同一个 `config.yaml` 文件而未加跨进程文件锁（`flock`）或临时文件原子 `rename`，导致新 Token 被慢进程用已失效 Token 覆写或写入半截 YAML。",
			GreCLICommands: []string{
				"gre_cli auth token",
				"gre_cli env current",
			},
			SandboxProbeScript: `awk '/concurrent_oauth_refresh=/ && /config_yaml_corrupt_or_stale_overwrite=true/ {print "VERIFIED:oauth_token_race_overwrite " $0}' "$TELEMETRY_FILE"`,
			RemediationSOP:     "1. 对 `~/.gre_cli/config.yaml.lock` 加排他文件锁（`syscall.Flock`），拿到锁后先重读磁盘配置做 Double-Check（若其他进程已刷新则直接复用）；2. 配置落盘必须先写同目录临时文件 `config.yaml.tmp.<pid>` 并 `fsync`，再通过 `os.Rename` 原子替换。",
			Tags:               []string{"oauth2", "token", "refresh_token", "race_condition", "config.yaml", "401", "flock", "atomic_rename", "gre_cli"},
		},
		{
			ID:               "PM-009",
			Category:         "oauth_token_race_overwrite",
			Title:            "Postmortem: 巡检脚本并发调用 gre_cli 引发 OAuth2 Token 互相踢下线与配置文件损坏复盘",
			SymptomSummary:   "每整点 10 个并发巡检任务同时执行 `gre_cli alert list`，其中 7 个报 401 Token Revoked，偶发 `config.yaml` 字节截断。",
			RootCausePattern: "无锁并发刷新 OAuth2 Token 引发服务端 Token 旋转吊销与本地非原子覆写竞争。",
			GreCLICommands: []string{
				"gre_cli auth token --debug",
			},
			SandboxProbeScript: `grep -E "oauth_race_detected=true|yaml_trunc_write=true" "$TELEMETRY_FILE" >/dev/null && echo "VERIFIED:oauth_token_race_overwrite"`,
			RemediationSOP:     "实现文件锁 Double-Check 刷新与 Write-Temp-Then-Rename 原子持久化。",
			Tags:               []string{"postmortem", "gre_cli", "oauth2", "config_yaml"},
		},
		{
			ID:               "SOP-009",
			Category:         "oauth_token_race_overwrite",
			Title:            "SOP: 命令行工具多进程凭证刷新竞争与原子文件写入诊断指南",
			SymptomSummary:   "单进程执行正常，多进程并行时频繁 401 或配置文件损坏。",
			RootCausePattern: "并发写同一配置文件缺少 `flock` 与原子 `rename`。",
			GreCLICommands: []string{
				"gre_cli env current",
			},
			SandboxProbeScript: `grep -i "token_overwrite_race" "$TELEMETRY_FILE" >/dev/null && echo "VERIFIED:oauth_token_race_overwrite"`,
			RemediationSOP:     "检查多进程 `open(config.yaml, O_TRUNC)` 时间重叠窗口。",
			Tags:               []string{"sop", "oauth", "flock"},
		},

		// ==================== 10. frontend_memory_leak_oom ====================
		{
			ID:               "RB-010",
			Category:         "frontend_memory_leak_oom",
			Title:            "Runbook: 监控大盘定时器重复绑定事件与 WebGL 后台标签页 60fps 空转 OOM 排障",
			SymptomSummary:   "SRE 值班室大屏或运维人员浏览器打开 GPMM/NOC 实时拓扑监控大盘 2~4 小时后，页面帧率跌至 1fps 随后触发浏览器 `Aw, Snap! Out of Memory (RESULT_CODE_HUNG / OOM)` 崩溃；JS Heap 与 GPU 显存呈单调线性增长。",
			RootCausePattern: "Vue/React 组件在每次路由切换或自动刷新轮询重渲染时，重复调用 `setInterval` 及 `window.addEventListener('resize', ...)` 却未在 `onUnmounted` 中清理旧定时器与闭包引用的巨型图表实例（Detached DOM / ECharts / Three.js 实例累积）；同时拓扑图的 WebGL `requestAnimationFrame` 循环未监听 `document.visibilitychange`，在后台标签页或切屏状态下仍以 60fps 持续分配纹理缓冲而不释放。",
			GreCLICommands: []string{
				"gre_cli chart menus",
				"gre_cli chart list",
			},
			SandboxProbeScript: `awk '/active_interval_timers=/ && /webgl_contexts_leaked=/ {print "VERIFIED:frontend_memory_leak_oom " $0}' "$TELEMETRY_FILE"`,
			RemediationSOP:     "1. 在组件 `onBeforeUnmount`/`useEffect cleanup` 中严格清理 `clearInterval`、`removeEventListener` 并调用 `chart.dispose()` / `gl.getExtension('WEBGL_lose_context').loseContext()`；2. 监听 `visibilitychange` 事件，当 `document.hidden === true` 时暂停 WebGL 渲染帧循环与高频轮询。",
			Tags:               []string{"frontend", "memory_leak", "oom", "webgl", "setinterval", "echarts", "requestanimationframe", "detached_dom"},
		},
		{
			ID:               "PM-010",
			Category:         "frontend_memory_leak_oom",
			Title:            "Postmortem: NOC 3D 全球骨干网拓扑大盘浏览器定时崩溃（内存与显存双泄漏）复盘",
			SymptomSummary:   "值班大屏每运行 3 小时 JS Heap 突破 3.8GB 触发 V8 OOM，Heap Snapshot 显示存在 1400 个活跃 `setInterval` 闭包与 32 个未销毁的 `WebGLRenderingContext`。",
			RootCausePattern: "watch 周期更新数据时重复初始化定时器与 WebGL 画布，未做 dispose 与后台降帧。",
			GreCLICommands: []string{
				"gre_cli chart noc",
				"gre_cli chart variables",
			},
			SandboxProbeScript: `grep -E "js_heap_mb=[2-9][0-9]{3}|detached_webgl_ctx=[1-9]" "$TELEMETRY_FILE" >/dev/null && echo "VERIFIED:frontend_memory_leak_oom"`,
			RemediationSOP:     "单例复用图表与 WebGL 上下文，组件卸载强制 dispose，后台标签页自动挂起渲染。",
			Tags:               []string{"postmortem", "webgl", "v8_oom", "setinterval"},
		},
		{
			ID:               "SOP-010",
			Category:         "frontend_memory_leak_oom",
			Title:            "SOP: 前端监控大盘 JS Heap 泄漏、定时器累积与 WebGL 60fps 空转诊断规范",
			SymptomSummary:   "浏览器内存随打开时长线性上升直至 OOM 崩溃。",
			RootCausePattern: "未销毁的 `setInterval` 事件监听器与后台持续空转的 WebGL 帧循环。",
			GreCLICommands: []string{
				"gre_cli chart list",
			},
			SandboxProbeScript: `grep -i "raf_background_60fps_leak" "$TELEMETRY_FILE" >/dev/null && echo "VERIFIED:frontend_memory_leak_oom"`,
			RemediationSOP:     "通过沙箱分析前端性能遥测快照中的 `active_interval_timers` 与 `js_heap_mb` 增长斜率。",
			Tags:               []string{"sop", "frontend", "oom"},
		},
	}
}
