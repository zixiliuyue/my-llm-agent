// Command sre-agent 提供生产级 SRE 故障根因定位 Agent 的命令行入口，
// 支持按工单 ID、JSON 工单文件或自由故障描述执行多步 ReAct + Docker 沙箱实证诊断。
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/hongsen/llm-agent/internal/agent"
	"github.com/hongsen/llm-agent/internal/eval"
	"github.com/hongsen/llm-agent/internal/grecli"
	"github.com/hongsen/llm-agent/internal/rag"
	"github.com/hongsen/llm-agent/internal/sandbox"
)

func main() {
	ticketID := flag.String("ticket-id", "INC-2026-0058", "待诊断的历史故障工单 ID（如 INC-2026-0001 至 INC-2026-0100）")
	ticketFile := flag.String("ticket-file", "", "自定义故障工单 JSON 文件路径（可选）")
	strategyFlag := flag.String("strategy", "full", "诊断策略模式: lexical | rag | full")
	dockerImage := flag.String("docker-image", sandbox.DefaultSandboxImage, "Docker 沙箱容器镜像")
	greBin := flag.String("gre-cli-bin", "", "可选本机 gre_cli 二进制路径")
	outputJSON := flag.Bool("json", false, "是否以美化 JSON 格式输出完整诊断轨迹")
	flag.Parse()

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	log.Printf("[SRE-Agent] 启动初始化: strategy=%s docker_image=%s ticket_id=%s", *strategyFlag, *dockerImage, *ticketID)

	// 1. 构建 256 维 HNSW + Okapi BM25 + RRF 混合检索器并加载 30 篇 SRE 知识库
	corpus := rag.DefaultSREKnowledgeCorpus()
	retriever := rag.NewHybridRetriever(nil, rag.DefaultHybridRetrieverConfig())
	if err := retriever.IndexDocuments(ctx, corpus); err != nil {
		log.Fatalf("[SRE-Agent] 索引 SRE 知识库失败: %v", err)
	}

	// 2. 初始化受限 Docker 容器沙箱执行器
	sbxCfg := sandbox.DefaultDockerSandboxConfig()
	sbxCfg.Image = *dockerImage
	sbx := sandbox.NewDockerSandboxExecutor(sbxCfg)

	// 3. 解析目标故障工单
	var targetTicket agent.IncidentTicket
	if *ticketFile != "" {
		raw, err := os.ReadFile(*ticketFile)
		if err != nil {
			log.Fatalf("[SRE-Agent] 读取工单文件 %s 失败: %v", *ticketFile, err)
		}
		if err := json.Unmarshal(raw, &targetTicket); err != nil {
			log.Fatalf("[SRE-Agent] 解析工单 JSON 失败: %v", err)
		}
	} else {
		found := false
		for _, t := range eval.GenerateHistoricalBenchmarkTickets() {
			if t.TicketID == *ticketID {
				targetTicket = t
				found = true
				break
			}
		}
		if !found {
			log.Fatalf("[SRE-Agent] 未找到工单 ID %s（有效范围 INC-2026-0001 ~ INC-2026-0100）", *ticketID)
		}
	}

	var mode agent.StrategyMode
	switch *strategyFlag {
	case "lexical":
		mode = agent.StrategyBaselineLexical
	case "rag":
		mode = agent.StrategyRAGOnly
	default:
		mode = agent.StrategyFullSREAgent
	}

	sreAgent := agent.NewSREAgent(agent.SREAgentConfig{
		LLMBaseURL: os.Getenv("OPENAI_BASE_URL"),
		LLMAPIKey:  os.Getenv("OPENAI_API_KEY"),
		LLMModel:   os.Getenv("OPENAI_MODEL"),
	}, retriever, sbx, grecli.NewExecutor(*greBin))

	verdict, err := sreAgent.Diagnose(ctx, targetTicket, mode)
	if err != nil {
		log.Fatalf("[SRE-Agent] 诊断执行失败: %v", err)
	}

	if *outputJSON {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		_ = enc.Encode(verdict)
		return
	}

	fmt.Printf("================================================================================\n")
	fmt.Printf("工单编号: %s | 严重度: %s | 所属项目: %s\n", targetTicket.TicketID, targetTicket.Severity, targetTicket.Project)
	fmt.Printf("工单标题: %s\n", targetTicket.Title)
	fmt.Printf("诊断策略: %s\n", verdict.Strategy)
	fmt.Printf("--------------------------------------------------------------------------------\n")
	for _, step := range verdict.Steps {
		fmt.Printf("[Step %d | %s | %.2fms | %d tokens]\n", step.StepIndex, step.Phase, step.LatencyMs, step.Tokens.TotalTokens)
		fmt.Printf("  Thought    : %s\n", step.Thought)
		fmt.Printf("  Tool       : %s (%s)\n", step.ToolName, step.ToolCommand)
		fmt.Printf("  Observation: %s\n", step.Observation)
	}
	fmt.Printf("--------------------------------------------------------------------------------\n")
	fmt.Printf("预测 Top-1 根因 : %s (GroundTruth: %s)\n", verdict.PredictedTop1, targetTicket.GroundTruth)
	fmt.Printf("预测 Top-3 候选 : %v\n", verdict.PredictedTop3)
	fmt.Printf("匹配 Runbook    : %s (置信度: %.2f)\n", verdict.MatchedRunbookID, verdict.Confidence)
	fmt.Printf("Docker 沙箱验证 : executed=%t verified=%t output=%q\n",
		verdict.SandboxExecuted, verdict.SandboxVerified, verdict.SandboxVerificationKV)
	if verdict.MaliciousHintBlocked {
		fmt.Printf("安全门禁拦截    : blocked=true violation=%s\n", verdict.BlockedViolationCode)
	}
	fmt.Printf("总耗时 / 成本   : %.2f ms | %d tokens ($%.6f)\n",
		verdict.TotalLatencyMs, verdict.TotalTokens.TotalTokens, verdict.TotalTokens.EstimatedCostUSD)
	fmt.Printf("根因结论        : %s\n", verdict.RootCauseExplanation)
	fmt.Printf("处置 SOP        : %s\n", verdict.RemediationPlan)
	fmt.Printf("================================================================================\n")
}
