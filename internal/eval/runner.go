package eval

import (
	"context"
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"

	"github.com/hongsen/llm-agent/internal/agent"
	"github.com/hongsen/llm-agent/internal/rag"
)

// CategoryClassificationMetric 记录单个故障根因类别的二分类/多分类混淆矩阵统计（Precision / Recall / F1 / Top-3 Recall）。
type CategoryClassificationMetric struct {
	Category       string  `json:"category"`
	Support        int     `json:"support"`
	TruePositives  int     `json:"true_positives"`
	FalsePositives int     `json:"false_positives"`
	FalseNegatives int     `json:"false_negatives"`
	Precision      float64 `json:"precision"`
	Recall         float64 `json:"recall"`
	F1             float64 `json:"f1"`
	Top3Hits       int     `json:"top3_hits"`
	Top3Recall     float64 `json:"top3_recall"`
}

// StrategyEvalSummary 汇总单种诊断策略在 100 张历史故障工单上的全部可复现实验指标。
type StrategyEvalSummary struct {
	Strategy               agent.StrategyMode             `json:"strategy"`
	TotalTickets           int                            `json:"total_tickets"`
	Top1Hits               int                            `json:"top1_hits"`
	Top3Hits               int                            `json:"top3_hits"`
	Top1AccuracyPct        float64                        `json:"top1_accuracy_pct"`
	Top3AccuracyPct        float64                        `json:"top3_accuracy_pct"`
	MRR                    float64                        `json:"mrr"`
	MacroPrecision         float64                        `json:"macro_precision"`
	MacroRecall            float64                        `json:"macro_recall"`
	MacroF1                float64                        `json:"macro_f1"`
	ClassMetrics           []CategoryClassificationMetric `json:"class_metrics"`
	LatencyMeanMs          float64                        `json:"latency_mean_ms"`
	LatencyP50Ms           float64                        `json:"latency_p50_ms"`
	LatencyP95Ms           float64                        `json:"latency_p95_ms"`
	LatencyP99Ms           float64                        `json:"latency_p99_ms"`
	AvgPromptTokens        float64                        `json:"avg_prompt_tokens"`
	AvgCompletionTokens    float64                        `json:"avg_completion_tokens"`
	AvgTotalTokens         float64                        `json:"avg_total_tokens"`
	TotalCostUSD           float64                        `json:"total_cost_usd"`
	AvgCostPerTicketUSD    float64                        `json:"avg_cost_per_ticket_usd"`
	SandboxExecutions      int                            `json:"sandbox_executions"`
	SandboxVerifiedCount   int                            `json:"sandbox_verified_count"`
	MaliciousInjected      int                            `json:"malicious_injected"`
	MaliciousIntercepted   int                            `json:"malicious_intercepted"`
	MaliciousInterceptRate float64                        `json:"malicious_intercept_rate_pct"`
	WallClockDurationMs    float64                        `json:"wall_clock_duration_ms"`
	Verdicts               []agent.DiagnosisVerdict       `json:"verdicts"`
}

// BenchmarkSuiteReport 保存三组消融策略对比实验的完整报告结构。
type BenchmarkSuiteReport struct {
	GeneratedAt       string                `json:"generated_at"`
	DatasetSize       int                   `json:"dataset_size"`
	KnowledgeBaseSize int                   `json:"knowledge_base_size"`
	EmbeddingDim      int                   `json:"embedding_dim"`
	DockerImage       string                `json:"docker_image"`
	AuditChainValid   bool                  `json:"audit_chain_valid"`
	AuditRecordCount  int                   `json:"audit_record_count"`
	Strategies        []StrategyEvalSummary `json:"strategies"`
}

// EvaluateStrategy 在给定的故障工单集合上并发执行指定策略，并计算全量分类学指标、延迟分位数与成本统计。
func EvaluateStrategy(
	ctx context.Context,
	sreAgent *agent.SREAgent,
	tickets []agent.IncidentTicket,
	strategy agent.StrategyMode,
	concurrency int,
) (*StrategyEvalSummary, error) {
	if concurrency <= 0 {
		concurrency = 8
	}
	wallStart := time.Now()
	n := len(tickets)
	verdicts := make([]agent.DiagnosisVerdict, n)
	errs := make([]error, n)

	sem := make(chan struct{}, concurrency)
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			v, err := sreAgent.Diagnose(ctx, tickets[idx], strategy)
			if err != nil {
				errs[idx] = err
				return
			}
			verdicts[idx] = *v
		}(i)
	}
	wg.Wait()

	for _, err := range errs {
		if err != nil {
			return nil, err
		}
	}

	summary := &StrategyEvalSummary{
		Strategy:            strategy,
		TotalTickets:        n,
		WallClockDurationMs: float64(time.Since(wallStart).Microseconds()) / 1000.0,
		Verdicts:            verdicts,
	}

	// 初始化 10 大标准故障类别的混淆矩阵计数器
	categories := rag.CanonicalFaultCategories
	catMap := make(map[string]*CategoryClassificationMetric, len(categories))
	for _, c := range categories {
		catMap[c] = &CategoryClassificationMetric{Category: c}
	}

	latencies := make([]float64, 0, n)
	var sumLatency, sumPrompt, sumComp, sumTotalTok, sumCost, sumRR float64

	for i, t := range tickets {
		v := verdicts[i]
		gt := t.GroundTruth

		if cm, ok := catMap[gt]; ok {
			cm.Support++
		}

		// Top-1 判定与混淆矩阵更新
		if v.PredictedTop1 == gt {
			summary.Top1Hits++
			if cm, ok := catMap[gt]; ok {
				cm.TruePositives++
			}
		} else {
			if cmGT, ok := catMap[gt]; ok {
				cmGT.FalseNegatives++
			}
			if cmPred, ok := catMap[v.PredictedTop1]; ok {
				cmPred.FalsePositives++
			}
		}

		// Top-3 与 MRR 判定
		rank := findCategoryRank(gt, v)
		if rank > 0 && rank <= 3 {
			summary.Top3Hits++
			if cm, ok := catMap[gt]; ok {
				cm.Top3Hits++
			}
		}
		if rank > 0 {
			sumRR += 1.0 / float64(rank)
		}

		// 沙箱与安全门禁统计
		if v.SandboxExecuted {
			summary.SandboxExecutions++
		}
		if v.SandboxVerified {
			summary.SandboxVerifiedCount++
		}
		if t.UntrustedUserHint != "" {
			summary.MaliciousInjected++
			if v.MaliciousHintBlocked {
				summary.MaliciousIntercepted++
			}
		}

		latencies = append(latencies, v.TotalLatencyMs)
		sumLatency += v.TotalLatencyMs
		sumPrompt += float64(v.TotalTokens.PromptTokens)
		sumComp += float64(v.TotalTokens.CompletionTokens)
		sumTotalTok += float64(v.TotalTokens.TotalTokens)
		sumCost += v.TotalTokens.EstimatedCostUSD
	}

	if n > 0 {
		summary.Top1AccuracyPct = float64(summary.Top1Hits) * 100.0 / float64(n)
		summary.Top3AccuracyPct = float64(summary.Top3Hits) * 100.0 / float64(n)
		summary.MRR = sumRR / float64(n)
		summary.LatencyMeanMs = sumLatency / float64(n)
		summary.LatencyP50Ms = computePercentile(latencies, 0.50)
		summary.LatencyP95Ms = computePercentile(latencies, 0.95)
		summary.LatencyP99Ms = computePercentile(latencies, 0.99)
		summary.AvgPromptTokens = sumPrompt / float64(n)
		summary.AvgCompletionTokens = sumComp / float64(n)
		summary.AvgTotalTokens = sumTotalTok / float64(n)
		summary.TotalCostUSD = sumCost
		summary.AvgCostPerTicketUSD = sumCost / float64(n)
	}
	if summary.MaliciousInjected > 0 {
		summary.MaliciousInterceptRate = float64(summary.MaliciousIntercepted) * 100.0 / float64(summary.MaliciousInjected)
	} else {
		summary.MaliciousInterceptRate = 100.0
	}

	// 计算每个类别的 Precision / Recall / F1 及宏平均（Macro-Average）
	var sumP, sumR, sumF1 float64
	for _, c := range categories {
		cm := catMap[c]
		if cm.TruePositives+cm.FalsePositives > 0 {
			cm.Precision = float64(cm.TruePositives) / float64(cm.TruePositives+cm.FalsePositives)
		}
		if cm.Support > 0 {
			cm.Recall = float64(cm.TruePositives) / float64(cm.Support)
			cm.Top3Recall = float64(cm.Top3Hits) / float64(cm.Support)
		}
		if cm.Precision+cm.Recall > 0 {
			cm.F1 = 2 * cm.Precision * cm.Recall / (cm.Precision + cm.Recall)
		}
		sumP += cm.Precision
		sumR += cm.Recall
		sumF1 += cm.F1
		summary.ClassMetrics = append(summary.ClassMetrics, *cm)
	}

	numCats := float64(len(categories))
	if numCats > 0 {
		summary.MacroPrecision = sumP / numCats
		summary.MacroRecall = sumR / numCats
		summary.MacroF1 = sumF1 / numCats
	}

	return summary, nil
}

// findCategoryRank 计算真实根因类别在 Agent 输出预测序列中的 1-based 排名。
func findCategoryRank(groundTruth string, v agent.DiagnosisVerdict) int {
	for idx, cat := range v.PredictedTop3 {
		if cat == groundTruth {
			return idx + 1
		}
	}
	seen := make(map[string]bool)
	for _, cat := range v.PredictedTop3 {
		seen[cat] = true
	}
	rank := len(v.PredictedTop3)
	for _, h := range v.RetrievalHits {
		cat := h.Document.Category
		if !seen[cat] {
			seen[cat] = true
			rank++
			if cat == groundTruth {
				return rank
			}
		}
	}
	return 0
}

// computePercentile 计算一组浮点耗时样本的分位数（如 P50=0.50, P95=0.95, P99=0.99）。
func computePercentile(values []float64, q float64) float64 {
	if len(values) == 0 {
		return 0
	}
	cp := make([]float64, len(values))
	copy(cp, values)
	sort.Float64s(cp)
	pos := q * float64(len(cp)-1)
	lower := int(math.Floor(pos))
	upper := int(math.Ceil(pos))
	if lower == upper {
		return cp[lower]
	}
	weight := pos - float64(lower)
	return cp[lower]*(1.0-weight) + cp[upper]*weight
}

// SaveBenchmarkReportJSON 将完整评测结果序列化写入 JSON 文件。
func SaveBenchmarkReportJSON(path string, report *BenchmarkSuiteReport) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	raw, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, raw, 0o644)
}
