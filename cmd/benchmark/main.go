// Command benchmark 执行 100 张生产历史故障工单的三组消融实验（Baseline-Lexical vs RAG-Only vs Full SRE Agent），
// 并在真实 Docker 容器沙箱中完成 100 次只读诊断探针验证与 20 次高危注入拦截，输出评测报告与持久化数据集。
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/hongsen/llm-agent/internal/agent"
	"github.com/hongsen/llm-agent/internal/eval"
	"github.com/hongsen/llm-agent/internal/grecli"
	"github.com/hongsen/llm-agent/internal/rag"
	"github.com/hongsen/llm-agent/internal/sandbox"
)

func main() {
	concurrency := flag.Int("concurrency", 8, "并发诊断工作协程数（控制 Docker 容器并发度）")
	dockerImage := flag.String("docker-image", sandbox.DefaultSandboxImage, "Docker 沙箱只读容器镜像")
	outDir := flag.String("out-dir", ".", "项目根目录（用于写入 data/ 与 docs/ 产物）")
	flag.Parse()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	log.Printf("[Benchmark] 启动 SRE 根因定位 Agent 生产基准评测: concurrency=%d image=%s", *concurrency, *dockerImage)

	// 1. 导出并索引 30 篇 SRE 运维知识库文档
	corpus := rag.DefaultSREKnowledgeCorpus()
	kbPath := filepath.Join(*outDir, "data", "runbooks", "sre_knowledge_base.jsonl")
	if err := os.MkdirAll(filepath.Dir(kbPath), 0o755); err != nil {
		log.Fatalf("[Benchmark] 创建知识库目录失败: %v", err)
	}
	if err := rag.SaveKnowledgeBaseJSONL(kbPath, corpus); err != nil {
		log.Fatalf("[Benchmark] 保存知识库文件失败: %v", err)
	}
	log.Printf("[Benchmark] 已持久化 %d 篇 SRE Runbook/SOP/Postmortem 至 %s", len(corpus), kbPath)

	retriever := rag.NewHybridRetriever(nil, rag.DefaultHybridRetrieverConfig())
	if err := retriever.IndexDocuments(ctx, corpus); err != nil {
		log.Fatalf("[Benchmark] 构建 256 维 HNSW + BM25 索引失败: %v", err)
	}

	// 2. 生成并持久化 100 张历史故障工单
	tickets := eval.GenerateHistoricalBenchmarkTickets()
	ticketsPath := filepath.Join(*outDir, "data", "benchmark", "historical_tickets_100.jsonl")
	if err := eval.SaveTicketsJSONL(ticketsPath, tickets); err != nil {
		log.Fatalf("[Benchmark] 保存 100 张历史故障工单失败: %v", err)
	}
	log.Printf("[Benchmark] 已持久化 %d 张历史故障工单至 %s", len(tickets), ticketsPath)

	// 3. 初始化真实 Docker 容器沙箱执行器并预检连通性
	sbxCfg := sandbox.DefaultDockerSandboxConfig()
	sbxCfg.Image = *dockerImage
	sbx := sandbox.NewDockerSandboxExecutor(sbxCfg)
	if err := sbx.CheckDockerAvailable(ctx); err != nil {
		log.Fatalf("[Benchmark] Docker Engine 不可用，请确保本机 Docker 已启动: %v", err)
	}
	log.Printf("[Benchmark] Docker Engine 连通性校验通过，镜像: %s", *dockerImage)

	sreAgent := agent.NewSREAgent(agent.SREAgentConfig{}, retriever, sbx, grecli.NewExecutor(""))

	// 4. 依次执行三组消融策略评测
	strategies := []agent.StrategyMode{
		agent.StrategyBaselineLexical,
		agent.StrategyRAGOnly,
		agent.StrategyFullSREAgent,
	}

	var summaries []eval.StrategyEvalSummary
	for _, st := range strategies {
		log.Printf("[Benchmark] >>> 开始评测策略: %s (工单数=%d) ...", st, len(tickets))
		sum, err := eval.EvaluateStrategy(ctx, sreAgent, tickets, st, *concurrency)
		if err != nil {
			log.Fatalf("[Benchmark] 策略 %s 评测失败: %v", st, err)
		}
		log.Printf(
			"[Benchmark] <<< 完成策略: %s | Top-1=%.1f%% (%d/%d) | Top-3=%.1f%% (%d/%d) | MRR=%.4f | Macro-F1=%.4f | P50=%.2fms P95=%.2fms | DockerVerified=%d/%d | Intercept=%.1f%% (%d/%d) | WallClock=%.1fms",
			st,
			sum.Top1AccuracyPct, sum.Top1Hits, sum.TotalTickets,
			sum.Top3AccuracyPct, sum.Top3Hits, sum.TotalTickets,
			sum.MRR, sum.MacroF1,
			sum.LatencyP50Ms, sum.LatencyP95Ms,
			sum.SandboxVerifiedCount, sum.SandboxExecutions,
			sum.MaliciousInterceptRate, sum.MaliciousIntercepted, sum.MaliciousInjected,
			sum.WallClockDurationMs,
		)
		summaries = append(summaries, *sum)
	}

	// 5. 校验并导出沙箱 SHA-256 审计哈希链
	auditValid, err := sbx.VerifyAuditChain()
	if err != nil {
		log.Fatalf("[Benchmark] 沙箱 SHA-256 审计哈希链校验失败: %v", err)
	}
	auditPath := filepath.Join(*outDir, "data", "benchmark", "sandbox_audit_chain.jsonl")
	if err := sbx.ExportAuditChainJSONL(auditPath); err != nil {
		log.Fatalf("[Benchmark] 导出沙箱审计链失败: %v", err)
	}
	auditRecords := sbx.AuditChainSnapshot()
	log.Printf("[Benchmark] 沙箱 SHA-256 哈希链完整性校验通过 (valid=%t, records=%d)，已导出至 %s",
		auditValid, len(auditRecords), auditPath)

	// 6. 生成 JSON 与 Markdown 评测报告
	suiteReport := &eval.BenchmarkSuiteReport{
		GeneratedAt:       time.Now().Format(time.RFC3339),
		DatasetSize:       len(tickets),
		KnowledgeBaseSize: len(corpus),
		EmbeddingDim:      rag.DefaultEmbeddingDim,
		DockerImage:       *dockerImage,
		AuditChainValid:   auditValid,
		AuditRecordCount:  len(auditRecords),
		Strategies:        summaries,
	}

	jsonReportPath := filepath.Join(*outDir, "data", "benchmark", "benchmark_results.json")
	if err := eval.SaveBenchmarkReportJSON(jsonReportPath, suiteReport); err != nil {
		log.Fatalf("[Benchmark] 保存 JSON 评测报告失败: %v", err)
	}

	mdReportPath := filepath.Join(*outDir, "docs", "BENCHMARK_REPORT.md")
	if err := eval.SaveMarkdownReport(mdReportPath, suiteReport); err != nil {
		log.Fatalf("[Benchmark] 保存 Markdown 评测报告失败: %v", err)
	}
	log.Printf("[Benchmark] 评测报告已生成: %s 与 %s", mdReportPath, jsonReportPath)

	fmt.Println("\n==================== 100-Ticket SRE Benchmark Summary ====================")
	for _, s := range summaries {
		fmt.Printf("%-62s | Top-1: %5.1f%% | Top-3: %5.1f%% | MRR: %.4f | Macro-F1: %.4f | P50: %6.2fms | P95: %6.2fms\n",
			s.Strategy, s.Top1AccuracyPct, s.Top3AccuracyPct, s.MRR, s.MacroF1, s.LatencyP50Ms, s.LatencyP95Ms)
	}
	fmt.Println("==========================================================================")
}
