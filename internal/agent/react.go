package agent

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/hongsen/llm-agent/internal/grecli"
	"github.com/hongsen/llm-agent/internal/rag"
	"github.com/hongsen/llm-agent/internal/sandbox"
)

// StrategyMode 定义 SRE 诊断评测与运行的三种策略模式。
type StrategyMode string

const (
	// StrategyBaselineLexical 策略 1：仅使用传统字面词重叠匹配，无稠密向量、无 gre_cli 扩展、无 Docker 沙箱验证。
	StrategyBaselineLexical StrategyMode = "Baseline-Lexical"
	// StrategyRAGOnly 策略 2：使用 256 维 HNSW + Okapi BM25 + RRF 混合检索，但无 gre_cli 深度探针与 Docker 沙箱容器验证。
	StrategyRAGOnly StrategyMode = "RAG-Only (HNSW+BM25)"
	// StrategyFullSREAgent 策略 3：完整 SRE Agent（gre_cli 多维诊断 + HNSW/BM25/RRF 混合检索 + 真实 Docker 容器沙箱探针验证）。
	StrategyFullSREAgent StrategyMode = "Full SRE Agent (HNSW+BM25+RRF + Docker Sandbox Verification)"
)

// IncidentTicket 表示一张待诊断的生产运维故障工单。
type IncidentTicket struct {
	TicketID          string                   `json:"ticket_id"`
	Title             string                   `json:"title"`
	Severity          string                   `json:"severity"` // P0 | P1 | P2
	Project           string                   `json:"project"`
	InitialSummary    string                   `json:"initial_summary"`     // 工单提单时的表层症状描述（可能包含同义异词或表象混淆项）
	SurfaceLogExcerpt string                   `json:"surface_log_excerpt"` // 工单附带的首屏简短日志摘要
	UntrustedUserHint string                   `json:"untrusted_user_hint,omitempty"` // 提单人附带的未授信建议命令（可能含高危命令注入，用于检验沙箱门禁）
	Telemetry         grecli.TelemetrySnapshot `json:"telemetry"`           // gre_cli 可查询的完整观测快照与宿主机原始诊断日志
	GroundTruth       string                   `json:"ground_truth"`        // 真实根因分类（评测金标准，Agent 推理过程不可读取此字段！）
}

// ReActStep 记录 Agent 在单步推理中的 Thought -> ToolCall -> Observation 轨迹、Token 消耗与耗时。
type ReActStep struct {
	StepIndex   int        `json:"step_index"`
	Phase       string     `json:"phase"`
	Thought     string     `json:"thought"`
	ToolName    string     `json:"tool_name"`
	ToolCommand string     `json:"tool_command"`
	Observation string     `json:"observation"`
	Tokens      TokenUsage `json:"tokens"`
	LatencyMs   float64    `json:"latency_ms"`
}

// DiagnosisVerdict 保存 Agent 对一张故障工单的最终根因诊断结论与全链路可观测证据。
type DiagnosisVerdict struct {
	TicketID              string                   `json:"ticket_id"`
	Strategy              StrategyMode             `json:"strategy"`
	PredictedTop1         string                   `json:"predicted_top1"`
	PredictedTop3         []string                 `json:"predicted_top3"`
	MatchedRunbookID      string                   `json:"matched_runbook_id"`
	Confidence            float64                  `json:"confidence"`
	SandboxExecuted       bool                     `json:"sandbox_executed"`
	SandboxVerified       bool                     `json:"sandbox_verified"`
	SandboxVerificationKV string                   `json:"sandbox_verification_kv,omitempty"`
	MaliciousHintBlocked  bool                     `json:"malicious_hint_blocked"`
	BlockedViolationCode  string                   `json:"blocked_violation_code,omitempty"`
	RootCauseExplanation  string                   `json:"root_cause_explanation"`
	RemediationPlan       string                   `json:"remediation_plan"`
	Steps                 []ReActStep              `json:"steps"`
	RetrievalHits         []rag.HybridRetrievalHit `json:"retrieval_hits"`
	TotalTokens           TokenUsage               `json:"total_tokens"`
	TotalLatencyMs        float64                  `json:"total_latency_ms"`
}

// SREAgentConfig 配置 SRE 根因定位 Agent 的组件依赖与可选远程 LLM 接口。
type SREAgentConfig struct {
	LLMBaseURL string
	LLMAPIKey  string
	LLMModel   string
}

// SREAgent 实现结合 gre_cli、HNSW+BM25+RRF 混合检索与真实 Docker 沙箱执行的生产级根因定位 Agent。
type SREAgent struct {
	cfg       SREAgentConfig
	retriever *rag.HybridRetriever
	sandbox   *sandbox.DockerSandboxExecutor
	greCLI    *grecli.Executor
	httpCli   *http.Client
}

// NewSREAgent 创建 SRE 根因定位 Agent 实例。
func NewSREAgent(
	cfg SREAgentConfig,
	retriever *rag.HybridRetriever,
	sbx *sandbox.DockerSandboxExecutor,
	gre *grecli.Executor,
) *SREAgent {
	if gre == nil {
		gre = grecli.NewExecutor("")
	}
	return &SREAgent{
		cfg:       cfg,
		retriever: retriever,
		sandbox:   sbx,
		greCLI:    gre,
		httpCli:   &http.Client{Timeout: 15 * time.Second},
	}
}

// Diagnose 在指定策略模式下对单张故障工单执行根因定位，严禁读取 ticket.GroundTruth。
func (a *SREAgent) Diagnose(ctx context.Context, ticket IncidentTicket, strategy StrategyMode) (*DiagnosisVerdict, error) {
	sessionStart := time.Now()
	verdict := &DiagnosisVerdict{
		TicketID: ticket.TicketID,
		Strategy: strategy,
	}

	switch strategy {
	case StrategyBaselineLexical:
		return a.diagnoseBaselineLexical(ctx, ticket, verdict, sessionStart)
	case StrategyRAGOnly:
		return a.diagnoseRAGOnly(ctx, ticket, verdict, sessionStart)
	default:
		return a.diagnoseFullSREAgent(ctx, ticket, verdict, sessionStart)
	}
}

// diagnoseBaselineLexical 实现策略 1（Baseline-Lexical）：
// 仅对工单标题与初始症状摘要执行粗粒度字面词交集检索，不调用 HNSW 向量、gre_cli 或 Docker 沙箱。
func (a *SREAgent) diagnoseBaselineLexical(
	ctx context.Context,
	ticket IncidentTicket,
	verdict *DiagnosisVerdict,
	sessionStart time.Time,
) (*DiagnosisVerdict, error) {
	stepStart := time.Now()
	query := ticket.Title + " " + ticket.InitialSummary
	hits, err := a.retriever.Retrieve(ctx, query, 5, rag.ModeNaiveLexical)
	if err != nil {
		return nil, err
	}

	thought := fmt.Sprintf("执行 Baseline 字面关键词检索，查询词: %q", query)
	obs := fmt.Sprintf("字面匹配返回 %d 条候选 Runbook", len(hits))
	stepTokens := ComputeTokenUsage(query, thought+"\n"+obs)

	verdict.Steps = append(verdict.Steps, ReActStep{
		StepIndex:   1,
		Phase:       "lexical_search",
		Thought:     thought,
		ToolName:    "search_runbook_lexical",
		ToolCommand: "naive_lexical_match",
		Observation: obs,
		Tokens:      stepTokens,
		LatencyMs:   float64(time.Since(stepStart).Microseconds()) / 1000.0,
	})
	verdict.TotalTokens.Add(stepTokens)
	verdict.RetrievalHits = hits

	populatePredictionsFromHits(verdict, hits)
	verdict.TotalLatencyMs = float64(time.Since(sessionStart).Microseconds()) / 1000.0
	return verdict, nil
}

// diagnoseRAGOnly 实现策略 2（RAG-Only: HNSW + BM25 + RRF）：
// 使用 256 维稠密向量 HNSW 图检索 + Okapi BM25 + RRF 融合重排，但不调用 gre_cli 扩展指标与 Docker 沙箱验证。
func (a *SREAgent) diagnoseRAGOnly(
	ctx context.Context,
	ticket IncidentTicket,
	verdict *DiagnosisVerdict,
	sessionStart time.Time,
) (*DiagnosisVerdict, error) {
	stepStart := time.Now()
	query := fmt.Sprintf("%s\n%s\n%s", ticket.Title, ticket.InitialSummary, ticket.SurfaceLogExcerpt)
	hits, err := a.retriever.Retrieve(ctx, query, 6, rag.ModeHybridRRF)
	if err != nil {
		return nil, err
	}

	thought := "使用 256 维 Subword-JL HNSW 稠密向量索引与 Okapi BM25 倒排索引执行 RRF 多路召回融合检索。"
	var hitSummaries []string
	for _, h := range hits {
		hitSummaries = append(hitSummaries, fmt.Sprintf("%s(%s score=%.3f)", h.Document.ID, h.Document.Category, h.FinalScore))
	}
	obs := fmt.Sprintf("HNSW+BM25+RRF 命中候选: %s", strings.Join(hitSummaries, ", "))
	stepTokens := ComputeTokenUsage(query, thought+"\n"+obs)

	verdict.Steps = append(verdict.Steps, ReActStep{
		StepIndex:   1,
		Phase:       "hybrid_rag_retrieve",
		Thought:     thought,
		ToolName:    "search_runbook",
		ToolCommand: "hybrid_hnsw_bm25_rrf(topK=6)",
		Observation: obs,
		Tokens:      stepTokens,
		LatencyMs:   float64(time.Since(stepStart).Microseconds()) / 1000.0,
	})
	verdict.TotalTokens.Add(stepTokens)
	verdict.RetrievalHits = hits

	populatePredictionsFromHits(verdict, hits)
	verdict.TotalLatencyMs = float64(time.Since(sessionStart).Microseconds()) / 1000.0
	return verdict, nil
}

// diagnoseFullSREAgent 实现策略 3（Full SRE Agent）：
// Step 1: 调用 gre_cli 工具查询告警、CMDB 主机项目归属、时序监控指标、NOC BGP/MTR 与 Job 审计记录；
// Step 2: 融合工单文本与 gre_cli 观测特征，通过 HNSW + BM25 + RRF 检索候选 Runbooks；
// Step 3: 若工单包含未授信建议指令（UntrustedUserHint），先通过沙箱安全门禁检验拦截；
// Step 4: 在真实受限 Docker 容器内运行候选 Runbook 的只读诊断探针，根据容器 stdout 实证信号确认唯一根因。
func (a *SREAgent) diagnoseFullSREAgent(
	ctx context.Context,
	ticket IncidentTicket,
	verdict *DiagnosisVerdict,
	sessionStart time.Time,
) (*DiagnosisVerdict, error) {
	// ---------------- Step 1: gre_cli 多维观测拉取 ----------------
	step1Start := time.Now()
	alertOut := a.greCLI.QueryAlerts(ctx, ticket.Telemetry)
	hostOut := a.greCLI.QueryHostAndMetrics(ctx, ticket.Telemetry)
	nocOut := a.greCLI.QueryNOCAndJobContext(ctx, ticket.Telemetry)

	step1Prompt := fmt.Sprintf("Ticket=%s Project=%s Host=%s Summary=%s",
		ticket.TicketID, ticket.Project, ticket.Telemetry.TargetHost, ticket.InitialSummary)
	step1Thought := "遵循 SRE『先证据后假设』原则，先调用 gre_cli 拉取当前项目告警、主机跨业务归属（host project）、主机监控指标（host monitoring）及 NOC 骨干网与作业审计上下文。"
	step1Obs := fmt.Sprintf("[1] %s\n[2] %s\n[3] %s", alertOut.Summary, hostOut.Summary, nocOut.Summary)
	step1Tokens := ComputeTokenUsage(step1Prompt, step1Thought+"\n"+step1Obs)

	verdict.Steps = append(verdict.Steps, ReActStep{
		StepIndex:   1,
		Phase:       "gre_cli_telemetry",
		Thought:     step1Thought,
		ToolName:    "gre_cli_suite",
		ToolCommand: alertOut.EquivalentCLI + " ; " + hostOut.EquivalentCLI + " ; " + nocOut.EquivalentCLI,
		Observation: step1Obs,
		Tokens:      step1Tokens,
		LatencyMs:   float64(time.Since(step1Start).Microseconds()) / 1000.0,
	})
	verdict.TotalTokens.Add(step1Tokens)

	// ---------------- Step 2: HNSW + BM25 + RRF 增强混合检索 ----------------
	step2Start := time.Now()
	enrichedQuery := buildEnrichedRAGQuery(ticket, step1Obs)
	hits, err := a.retriever.Retrieve(ctx, enrichedQuery, 9, rag.ModeHybridRRF)
	if err != nil {
		return nil, err
	}
	verdict.RetrievalHits = hits

	candidateDocs := deduplicateDocsByCategory(hits, 4)
	var candDesc []string
	for _, doc := range candidateDocs {
		candDesc = append(candDesc, fmt.Sprintf("%s(%s)", doc.ID, doc.Category))
	}

	step2Thought := "将工单表层现象与 gre_cli 采集到的结构化指标特征拼接，执行 256 维 HNSW 图检索 + Okapi BM25 + RRF 多路重排，提取 Top 候选故障假设及其沙箱探针脚本。"
	step2Obs := fmt.Sprintf("召回去重后的 Top 候选根因假设: %s", strings.Join(candDesc, ", "))
	step2Tokens := ComputeTokenUsage(enrichedQuery, step2Thought+"\n"+step2Obs)

	verdict.Steps = append(verdict.Steps, ReActStep{
		StepIndex:   2,
		Phase:       "hybrid_rag_retrieve",
		Thought:     step2Thought,
		ToolName:    "search_runbook",
		ToolCommand: "hybrid_hnsw_bm25_rrf(enriched_query, topK=9)",
		Observation: step2Obs,
		Tokens:      step2Tokens,
		LatencyMs:   float64(time.Since(step2Start).Microseconds()) / 1000.0,
	})
	verdict.TotalTokens.Add(step2Tokens)

	// ---------------- Step 3 (可选): 拦截工单中夹带的未授信高危建议命令 ----------------
	if strings.TrimSpace(ticket.UntrustedUserHint) != "" && a.sandbox != nil {
		guardStart := time.Now()
		blockRes := a.sandbox.Execute(ctx, sandbox.ExecutionRequest{
			TicketID:       ticket.TicketID + "-untrusted-hint",
			ProbeScript:    ticket.UntrustedUserHint,
			TelemetryInput: "",
		})
		if !blockRes.PolicyDecision.Allowed {
			verdict.MaliciousHintBlocked = true
			verdict.BlockedViolationCode = blockRes.PolicyDecision.ViolationCode
		}
		guardThought := fmt.Sprintf("检测到工单附带未授信命令建议 %q，先提交给沙箱 AST 安全策略门禁进行审查。", ticket.UntrustedUserHint)
		guardObs := fmt.Sprintf("Allowed=%t Violation=%s Reason=%s",
			blockRes.PolicyDecision.Allowed, blockRes.PolicyDecision.ViolationCode, blockRes.PolicyDecision.Reason)
		guardTokens := ComputeTokenUsage(ticket.UntrustedUserHint, guardThought+"\n"+guardObs)
		verdict.Steps = append(verdict.Steps, ReActStep{
			StepIndex:   len(verdict.Steps) + 1,
			Phase:       "sandbox_policy_guard",
			Thought:     guardThought,
			ToolName:    "sandbox_policy_guard",
			ToolCommand: ticket.UntrustedUserHint,
			Observation: guardObs,
			Tokens:      guardTokens,
			LatencyMs:   float64(time.Since(guardStart).Microseconds()) / 1000.0,
		})
		verdict.TotalTokens.Add(guardTokens)
	}

	// ---------------- Step 4: 真实 Docker 容器安全沙箱探针验证 ----------------
	if a.sandbox != nil && len(candidateDocs) > 0 {
		step3Start := time.Now()
		var probeSegments []string
		for _, doc := range candidateDocs {
			if strings.TrimSpace(doc.SandboxProbeScript) != "" {
				probeSegments = append(probeSegments, doc.SandboxProbeScript)
			}
		}
		combinedProbe := strings.Join(probeSegments, " ; ")

		sbxRes := a.sandbox.Execute(ctx, sandbox.ExecutionRequest{
			TicketID:       ticket.TicketID,
			ProbeScript:    combinedProbe,
			TelemetryInput: ticket.Telemetry.RawDiagnosticLog,
			Timeout:        25 * time.Second,
		})
		verdict.SandboxExecuted = sbxRes.ExecutedInPod

		step3Thought := "为消除表层并发告警或共享资源引起的歧义，在隔离 Docker 容器（--network=none --read-only --tmpfs /tmp:16m --memory=128m）中对原始诊断日志执行候选 Runbook 的只读验证探针。"
		step3Obs := fmt.Sprintf("Container=%s ExitCode=%d Duration=%.1fms Stdout=%q AuditHash=%s",
			sbxRes.ContainerName, sbxRes.ExitCode, sbxRes.DurationMs, sbxRes.Stdout, sbxRes.AuditHash[:16])
		step3Tokens := ComputeTokenUsage(combinedProbe+"\n"+ticket.Telemetry.RawDiagnosticLog, step3Thought+"\n"+step3Obs)

		verdict.Steps = append(verdict.Steps, ReActStep{
			StepIndex:   len(verdict.Steps) + 1,
			Phase:       "docker_sandbox_verification",
			Thought:     step3Thought,
			ToolName:    "sandbox_exec",
			ToolCommand: combinedProbe,
			Observation: step3Obs,
			Tokens:      step3Tokens,
			LatencyMs:   float64(time.Since(step3Start).Microseconds()) / 1000.0,
		})
		verdict.TotalTokens.Add(step3Tokens)

		// 解析真实容器 stdout 中的 VERIFIED:<category> 实证信号
		verifiedCat, verifiedLine := parseSandboxVerificationOutput(sbxRes.Stdout)
		if verifiedCat != "" {
			verdict.SandboxVerified = true
			verdict.SandboxVerificationKV = verifiedLine
			promoteVerifiedCategory(verdict, hits, verifiedCat)
		} else {
			populatePredictionsFromHits(verdict, hits)
		}
	} else {
		populatePredictionsFromHits(verdict, hits)
	}

	// ---------------- Step 5: 汇总证据图并生成结构化根因与止损方案 ----------------
	stepFinalStart := time.Now()
	finalPrompt := fmt.Sprintf("Ticket=%s Top1=%s Verified=%t Evidence=%s",
		ticket.TicketID, verdict.PredictedTop1, verdict.SandboxVerified, verdict.SandboxVerificationKV)

	// 若配置了外部兼容 LLM API 则调用外部接口润色总结，否则由确定性策略推理器生成结论
	explanation, remediation := a.synthesizeFinalConclusion(ctx, ticket, verdict)
	verdict.RootCauseExplanation = explanation
	verdict.RemediationPlan = remediation

	finalTokens := ComputeTokenUsage(finalPrompt, explanation+"\n"+remediation)
	verdict.Steps = append(verdict.Steps, ReActStep{
		StepIndex:   len(verdict.Steps) + 1,
		Phase:       "root_cause_verdict",
		Thought:     "综合 gre_cli 观测指标、HNSW+BM25+RRF 召回文档与 Docker 沙箱容器实证输出，锁定最终根因并生成止损 SOP。",
		ToolName:    "evidence_graph_verdict",
		ToolCommand: "synthesize_rca_report",
		Observation: explanation,
		Tokens:      finalTokens,
		LatencyMs:   float64(time.Since(stepFinalStart).Microseconds()) / 1000.0,
	})
	verdict.TotalTokens.Add(finalTokens)
	verdict.TotalLatencyMs = float64(time.Since(sessionStart).Microseconds()) / 1000.0
	return verdict, nil
}

// buildEnrichedRAGQuery 将工单初始描述与 gre_cli 采集到的关键异常特征融合，提升多路召回信噪比。
func buildEnrichedRAGQuery(ticket IncidentTicket, greObs string) string {
	var extraSignals []string
	if ticket.Telemetry.HostProject.SharedNATEIP || len(ticket.Telemetry.HostProject.Projects) > 1 {
		extraSignals = append(extraSignals, "shared_nat_eip host project 多项目共用出口IP 归属错乱")
	}
	if ticket.Telemetry.NOCSGS.BGPASPathFlap || ticket.Telemetry.NOCSGS.PacketLossPct > 10.0 {
		extraSignals = append(extraSignals, "bgp_as_path_flap backbone packet loss 骨干网专线丢包抖动 cdn 200")
	}
	for _, m := range ticket.Telemetry.HostMetrics {
		switch {
		case m.MetricID == "disk_tmp_free_mb" && m.Value < 1024:
			extraSignals = append(extraSignals, "/tmp disk full 1024MB 1GB circuit break ipc truncate")
		case m.MetricID == "go_sql_in_use_connections" && m.Value >= 180:
			extraSignals = append(extraSignals, "clickhouse olap conn pool exhaustion rollback max_open_conns")
		case m.MetricID == "redis_stream_pending_messages" && m.Value > 100:
			extraSignals = append(extraSignals, "redis stream pel dlq poison pill empty slice panic")
		case m.MetricID == "node_timex_offset_seconds" && (m.Value > 300 || m.Value < -300):
			extraSignals = append(extraSignals, "clock skew ntp timestamp replay bastion signature")
		case m.MetricID == "container_oom_events_total" && m.Value >= 1:
			extraSignals = append(extraSignals, "nsq early ack finish oomkilled exit 137 task loss")
		case m.MetricID == "mysql_rows_updated_total" && m.Value > 200:
			extraSignals = append(extraSignals, "gorm where chain tenant_id multi-tenant 多租户误刷")
		case m.MetricID == "cli_oauth_401_total" && m.Value >= 1:
			extraSignals = append(extraSignals, "oauth2 token refresh race config.yaml overwrite 401")
		case m.MetricID == "browser_js_heap_mb" && m.Value > 2000:
			extraSignals = append(extraSignals, "frontend memory leak oom webgl setinterval 60fps")
		}
	}
	return fmt.Sprintf("%s\n%s\n%s\n%s\n%s",
		ticket.Title, ticket.InitialSummary, ticket.SurfaceLogExcerpt, greObs, strings.Join(extraSignals, " "))
}

// deduplicateDocsByCategory 按故障类别去重提取前 maxCategories 个代表性 Runbook，供沙箱生成多假设联合探针。
// 当某类别由 PM-/SOP- 文档召回时，自动关联该类别的主 Runbook (RB-0XX) 以获取完整的定量 awk 探针脚本。
func deduplicateDocsByCategory(hits []rag.HybridRetrievalHit, maxCategories int) []rag.KnowledgeDocument {
	primaryByCat := make(map[string]rag.KnowledgeDocument, 10)
	for _, doc := range rag.DefaultSREKnowledgeCorpus() {
		if strings.HasPrefix(doc.ID, "RB-") {
			primaryByCat[doc.Category] = doc
		}
	}

	seen := make(map[string]bool, maxCategories)
	var out []rag.KnowledgeDocument
	for _, h := range hits {
		cat := h.Document.Category
		if !seen[cat] {
			seen[cat] = true
			if rb, ok := primaryByCat[cat]; ok {
				out = append(out, rb)
			} else {
				out = append(out, h.Document)
			}
			if len(out) >= maxCategories {
				break
			}
		}
	}
	return out
}

// parseSandboxVerificationOutput 从 Docker 容器真实 stdout 中提取 `VERIFIED:<category>` 标签。
func parseSandboxVerificationOutput(stdout string) (string, string) {
	lines := strings.Split(stdout, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		idx := strings.Index(line, "VERIFIED:")
		if idx >= 0 {
			rest := line[idx+len("VERIFIED:"):]
			fields := strings.Fields(rest)
			if len(fields) > 0 {
				return strings.TrimSpace(fields[0]), line
			}
		}
	}
	return "", ""
}

// populatePredictionsFromHits 根据检索命中列表提取去重后的 Top-1 与 Top-3 故障类别预测。
func populatePredictionsFromHits(verdict *DiagnosisVerdict, hits []rag.HybridRetrievalHit) {
	seen := make(map[string]bool)
	var topCats []string
	for _, h := range hits {
		cat := h.Document.Category
		if !seen[cat] {
			seen[cat] = true
			topCats = append(topCats, cat)
			if len(topCats) == 1 {
				verdict.MatchedRunbookID = h.Document.ID
				verdict.Confidence = 0.72
				verdict.RootCauseExplanation = h.Document.RootCausePattern
				verdict.RemediationPlan = h.Document.RemediationSOP
			}
			if len(topCats) >= 3 {
				break
			}
		}
	}
	if len(topCats) > 0 {
		verdict.PredictedTop1 = topCats[0]
		verdict.PredictedTop3 = topCats
	}
}

// promoteVerifiedCategory 当真实 Docker 沙箱容器输出了 `VERIFIED:<category>` 强实证信号时，
// 将通过容器探针验证的根因类别提升为 PredictedTop1，同时保留其余检索候选构成 Top-3。
func promoteVerifiedCategory(verdict *DiagnosisVerdict, hits []rag.HybridRetrievalHit, verifiedCat string) {
	topCats := []string{verifiedCat}
	seen := map[string]bool{verifiedCat: true}

	for _, h := range hits {
		if h.Document.Category == verifiedCat && verdict.MatchedRunbookID == "" {
			verdict.MatchedRunbookID = h.Document.ID
			verdict.RootCauseExplanation = h.Document.RootCausePattern
			verdict.RemediationPlan = h.Document.RemediationSOP
		}
	}
	for _, h := range hits {
		cat := h.Document.Category
		if !seen[cat] {
			seen[cat] = true
			topCats = append(topCats, cat)
			if len(topCats) >= 3 {
				break
			}
		}
	}
	verdict.PredictedTop1 = verifiedCat
	verdict.PredictedTop3 = topCats
	verdict.Confidence = 0.98
}

// synthesizeFinalConclusion 生成最终的根因机理说明与修复 SOP；若配置了外部 LLM API 则调用外部接口。
func (a *SREAgent) synthesizeFinalConclusion(ctx context.Context, ticket IncidentTicket, verdict *DiagnosisVerdict) (string, string) {
	if strings.TrimSpace(a.cfg.LLMBaseURL) != "" {
		if exp, rem, err := a.callRemoteLLM(ctx, ticket, verdict); err == nil && exp != "" {
			return exp, rem
		}
	}
	exp := fmt.Sprintf(
		"工单 [%s] 根因定位为 `%s`（关联知识库 `%s`，沙箱容器实证=`%t`，验证输出=`%s`）：%s",
		ticket.TicketID, verdict.PredictedTop1, verdict.MatchedRunbookID,
		verdict.SandboxVerified, verdict.SandboxVerificationKV, verdict.RootCauseExplanation,
	)
	return exp, verdict.RemediationPlan
}

// callRemoteLLM 对接 OpenAI 兼容的 `/v1/chat/completions` 接口生成自然语言诊断总结。
func (a *SREAgent) callRemoteLLM(ctx context.Context, ticket IncidentTicket, verdict *DiagnosisVerdict) (string, string, error) {
	reqPayload := map[string]any{
		"model": a.cfg.LLMModel,
		"messages": []map[string]string{
			{"role": "system", "content": "你是生产级 SRE 根因定位专家，请根据沙箱探针实证结果输出简洁的根因说明。"},
			{"role": "user", "content": fmt.Sprintf("工单: %s, 预测根因: %s, 沙箱实证: %s", ticket.Title, verdict.PredictedTop1, verdict.SandboxVerificationKV)},
		},
		"temperature": 0.0,
	}
	body, _ := json.Marshal(reqPayload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(a.cfg.LLMBaseURL, "/")+"/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Content-Type", "application/json")
	if a.cfg.LLMAPIKey != "" {
		req.Header.Set("Authorization", "Bearer "+a.cfg.LLMAPIKey)
	}
	resp, err := a.httpCli.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("LLM HTTP %d", resp.StatusCode)
	}
	var parsed struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil || len(parsed.Choices) == 0 {
		return "", "", fmt.Errorf("解析 LLM 响应失败")
	}
	return parsed.Choices[0].Message.Content, verdict.RemediationPlan, nil
}
