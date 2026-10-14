package rag

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"sort"
	"sync"
)

// RetrievalMode 定义知识库检索策略模式，用于生产混合检索与消融实验对比。
type RetrievalMode string

const (
	// ModeNaiveLexical 仅使用简单表层词匹配，用于 Baseline-Lexical 消融对比。
	ModeNaiveLexical RetrievalMode = "naive_lexical"
	// ModeDenseHNSW 仅使用 HNSW 256 维稠密向量图检索。
	ModeDenseHNSW RetrievalMode = "dense_hnsw"
	// ModeBM25Only 仅使用 Okapi BM25 倒排检索。
	ModeBM25Only RetrievalMode = "bm25_only"
	// ModeHybridRRF 同时执行 HNSW 稠密向量检索 + Okapi BM25 倒排检索，并通过 Reciprocal Rank Fusion (RRF) 重排。
	ModeHybridRRF RetrievalMode = "hybrid_hnsw_bm25_rrf"
)

// KnowledgeDocument 表示 SRE 运维知识库中的单篇标准 Runbook / SOP / Postmortem 复盘文档。
type KnowledgeDocument struct {
	ID                 string   `json:"id"`
	Category           string   `json:"category"`             // 对应 10 大典型故障根因分类标识
	Title              string   `json:"title"`                // Runbook 或历史复盘标题
	SymptomSummary     string   `json:"symptom_summary"`      // 告警表象与监控异动摘要
	RootCausePattern   string   `json:"root_cause_pattern"`   // 深层根因机理与代码/基础设施缺陷模式
	GreCLICommands     []string `json:"gre_cli_commands"`     // 推荐执行的 gre_cli 诊断子命令契约
	SandboxProbeScript string   `json:"sandbox_probe_script"` // 推荐在 Docker 隔离沙箱内执行的验证脚本模板
	RemediationSOP     string   `json:"remediation_sop"`      // 止损、修复与防复发规范
	Tags               []string `json:"tags"`                 // 关联组件与检索标签
}

// FullText 拼接文档完整语义内容，供稠密向量编码与 BM25 索引构建使用。
func (d KnowledgeDocument) FullText() string {
	return fmt.Sprintf(
		"%s\n类别: %s\n症状: %s\n根因机理: %s\n诊断命令: %v\n处置SOP: %s\n标签: %v",
		d.Title, d.Category, d.SymptomSummary, d.RootCausePattern, d.GreCLICommands, d.RemediationSOP, d.Tags,
	)
}

// HybridRetrievalHit 表示混合检索重排后的单条命中结果及多路证据明细。
type HybridRetrievalHit struct {
	Document       KnowledgeDocument `json:"document"`
	FinalScore     float64           `json:"final_score"`
	RRFScore       float64           `json:"rrf_score"`
	DenseScore     float64           `json:"dense_score"`      // HNSW 余弦相似度
	DenseRank      int               `json:"dense_rank"`       // HNSW 召回名次（1-based，0 表示未命中）
	BM25Score      float64           `json:"bm25_score"`       // Okapi BM25 原始分
	BM25Rank       int               `json:"bm25_rank"`        // BM25 召回名次（1-based，0 表示未命中）
	HNSWHops       int               `json:"hnsw_hops"`        // HNSW 图遍历跳数
	MatchedTerms   []string          `json:"matched_terms"`    // BM25 命中的词元列表
	RetrievalRoute RetrievalMode     `json:"retrieval_route"`  // 本次召回使用的策略路径
}

// HybridRetrieverConfig 定义 HNSW + BM25 + RRF 混合检索器的融合参数。
type HybridRetrieverConfig struct {
	HNSWConfig  HNSWConfig `json:"hnsw_config"`
	BM25Config  BM25Config `json:"bm25_config"`
	RRFConstant float64    `json:"rrf_constant"` // RRF 平滑常数 k（标准论文值 60，小规模精细库可设为 20）
	DenseWeight float64    `json:"dense_weight"` // HNSW 稠密向量路在 RRF 与分数融合中的权重
	BM25Weight  float64    `json:"bm25_weight"`  // BM25 倒排路在 RRF 与分数融合中的权重
}

// DefaultHybridRetrieverConfig 返回针对 SRE 运维知识库调优的默认混合检索配置。
func DefaultHybridRetrieverConfig() HybridRetrieverConfig {
	return HybridRetrieverConfig{
		HNSWConfig:  DefaultHNSWConfig(),
		BM25Config:  DefaultBM25Config(),
		RRFConstant: 20.0,
		DenseWeight: 0.60,
		BM25Weight:  0.40,
	}
}

// HybridRetriever 组合 Embedder、HNSW 多层图索引与 Okapi BM25 倒排索引，实现生产级多路召回与 RRF 重排。
type HybridRetriever struct {
	mu       sync.RWMutex
	cfg      HybridRetrieverConfig
	embedder Embedder
	hnsw     *HNSWIndex
	bm25     *BM25Index
	docs     []KnowledgeDocument
	docByID  map[string]KnowledgeDocument
}

// NewHybridRetriever 创建并初始化混合检索器。
func NewHybridRetriever(embedder Embedder, cfg HybridRetrieverConfig) *HybridRetriever {
	if embedder == nil {
		embedder = NewSubwordProjectionEmbedder(DefaultEmbeddingDim, 0)
	}
	if cfg.RRFConstant <= 0 {
		cfg = DefaultHybridRetrieverConfig()
	}
	return &HybridRetriever{
		cfg:      cfg,
		embedder: embedder,
		hnsw:     NewHNSWIndex(cfg.HNSWConfig),
		bm25:     NewBM25Index(cfg.BM25Config),
		docByID:  make(map[string]KnowledgeDocument, 64),
	}
}

// IndexDocuments 批量将 SRE 知识库文档编码为 256 维向量并构建 HNSW 多层图与 BM25 倒排索引。
func (r *HybridRetriever) IndexDocuments(ctx context.Context, docs []KnowledgeDocument) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	fullTexts := make([]string, len(docs))
	for i, d := range docs {
		fullTexts[i] = d.FullText()
	}

	// 若底层为离线 Subword 正交投影编码器，先基于全量语料拟合 IDF 权重
	if subEmb, ok := r.embedder.(*SubwordProjectionEmbedder); ok {
		subEmb.FitCorpus(fullTexts)
	} else if httpEmb, ok := r.embedder.(*OpenAIHTTPEmbedder); ok {
		if subFallback, ok2 := httpEmb.Fallback.(*SubwordProjectionEmbedder); ok2 {
			subFallback.FitCorpus(fullTexts)
		}
	}

	vectors, err := r.embedder.EmbedBatch(ctx, fullTexts)
	if err != nil {
		return fmt.Errorf("批量生成知识库稠密向量失败: %w", err)
	}

	for i, doc := range docs {
		r.docs = append(r.docs, doc)
		r.docByID[doc.ID] = doc
		meta := map[string]string{
			"category": doc.Category,
			"title":    doc.Title,
		}
		if err := r.hnsw.Add(doc.ID, vectors[i], meta); err != nil {
			return err
		}
		r.bm25.Add(doc.ID, fullTexts[i])
	}
	return nil
}

// Retrieve 根据指定的 RetrievalMode 执行知识库检索并返回 Top-K 结果。
// 当 mode == ModeHybridRRF 时，使用 Reciprocal Rank Fusion (RRF) 结合归一化相似度计算综合得分：
// RRF_Score(d) = w_dense * (1 / (k + rank_dense(d))) + w_bm25 * (1 / (k + rank_bm25(d)))
// 同时结合校准后的余弦相似度与 BM25 归一化分作为二级精排信号，消除同分并列歧义。
func (r *HybridRetriever) Retrieve(ctx context.Context, query string, topK int, mode RetrievalMode) ([]HybridRetrievalHit, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if topK <= 0 {
		topK = 5
	}
	if len(r.docs) == 0 {
		return nil, nil
	}

	switch mode {
	case ModeNaiveLexical:
		lexHits := SearchNaiveLexical(r.docs, query, topK)
		out := make([]HybridRetrievalHit, 0, len(lexHits))
		for idx, h := range lexHits {
			doc := r.docByID[h.DocID]
			out = append(out, HybridRetrievalHit{
				Document:       doc,
				FinalScore:     h.Score,
				BM25Score:      h.Score,
				BM25Rank:       idx + 1,
				MatchedTerms:   h.MatchedTerms,
				RetrievalRoute: ModeNaiveLexical,
			})
		}
		return out, nil

	case ModeBM25Only:
		bmHits := r.bm25.Search(query, topK)
		out := make([]HybridRetrievalHit, 0, len(bmHits))
		for idx, h := range bmHits {
			doc := r.docByID[h.DocID]
			out = append(out, HybridRetrievalHit{
				Document:       doc,
				FinalScore:     h.Score,
				BM25Score:      h.Score,
				BM25Rank:       idx + 1,
				MatchedTerms:   h.MatchedTerms,
				RetrievalRoute: ModeBM25Only,
			})
		}
		return out, nil

	case ModeDenseHNSW:
		qVec, err := r.embedder.Embed(ctx, query)
		if err != nil {
			return nil, err
		}
		denseHits := r.hnsw.Search(qVec, topK, r.cfg.HNSWConfig.EfSearch)
		out := make([]HybridRetrievalHit, 0, len(denseHits))
		for idx, h := range denseHits {
			doc := r.docByID[h.DocID]
			out = append(out, HybridRetrievalHit{
				Document:       doc,
				FinalScore:     h.Similarity,
				DenseScore:     h.Similarity,
				DenseRank:      idx + 1,
				HNSWHops:       h.VisitedHops,
				RetrievalRoute: ModeDenseHNSW,
			})
		}
		return out, nil

	default:
		// 默认执行 HNSW + BM25 + RRF 多路混合召回重排
		candidateK := topK * 4
		if candidateK < 20 {
			candidateK = 20
		}

		qVec, err := r.embedder.Embed(ctx, query)
		if err != nil {
			return nil, err
		}
		denseHits := r.hnsw.Search(qVec, candidateK, r.cfg.HNSWConfig.EfSearch)
		bm25Hits := r.bm25.Search(query, candidateK)

		maxBM25 := 1.0
		if len(bm25Hits) > 0 && bm25Hits[0].Score > 0 {
			maxBM25 = bm25Hits[0].Score
		}

		merged := make(map[string]*HybridRetrievalHit, candidateK*2)

		for idx, dh := range denseHits {
			rank := idx + 1
			doc := r.docByID[dh.DocID]
			rrfPart := r.cfg.DenseWeight * (1.0 / (r.cfg.RRFConstant + float64(rank)))
			merged[dh.DocID] = &HybridRetrievalHit{
				Document:       doc,
				RRFScore:       rrfPart,
				DenseScore:     dh.Similarity,
				DenseRank:      rank,
				HNSWHops:       dh.VisitedHops,
				RetrievalRoute: ModeHybridRRF,
			}
		}

		for idx, bh := range bm25Hits {
			rank := idx + 1
			rrfPart := r.cfg.BM25Weight * (1.0 / (r.cfg.RRFConstant + float64(rank)))
			hit, exists := merged[bh.DocID]
			if !exists {
				doc := r.docByID[bh.DocID]
				hit = &HybridRetrievalHit{
					Document:       doc,
					RetrievalRoute: ModeHybridRRF,
				}
				merged[bh.DocID] = hit
			}
			hit.RRFScore += rrfPart
			hit.BM25Score = bh.Score
			hit.BM25Rank = rank
			hit.MatchedTerms = bh.MatchedTerms
		}

		results := make([]HybridRetrievalHit, 0, len(merged))
		for _, hit := range merged {
			normBM25 := hit.BM25Score / maxBM25
			// FinalScore 综合 RRF 倒数名次融合分与校准后的双路连续相似度分
			calibratedSim := r.cfg.DenseWeight*hit.DenseScore + r.cfg.BM25Weight*normBM25
			hit.FinalScore = hit.RRFScore*10.0 + calibratedSim*0.5
			results = append(results, *hit)
		}

		sort.Slice(results, func(i, j int) bool {
			if math.Abs(results[i].FinalScore-results[j].FinalScore) < 1e-12 {
				return results[i].Document.ID < results[j].Document.ID
			}
			return results[i].FinalScore > results[j].FinalScore
		})

		if len(results) > topK {
			results = results[:topK]
		}
		return results, nil
	}
}

// HNSW 返回内部 HNSW 索引指针，用于诊断统计或持久化落盘。
func (r *HybridRetriever) HNSW() *HNSWIndex {
	return r.hnsw
}

// SaveKnowledgeBaseJSONL 将知识库文档以 JSONL 格式持久化写入磁盘。
func SaveKnowledgeBaseJSONL(filePath string, docs []KnowledgeDocument) error {
	f, err := os.Create(filePath)
	if err != nil {
		return err
	}
	defer f.Close()

	w := bufio.NewWriter(f)
	for _, doc := range docs {
		raw, err := json.Marshal(doc)
		if err != nil {
			return err
		}
		if _, err := w.Write(raw); err != nil {
			return err
		}
		if err := w.WriteByte('\n'); err != nil {
			return err
		}
	}
	return w.Flush()
}

// LoadKnowledgeBaseJSONL 从 JSONL 文件加载知识库文档集合。
func LoadKnowledgeBaseJSONL(filePath string) ([]KnowledgeDocument, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var docs []KnowledgeDocument
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}
		var doc KnowledgeDocument
		if err := json.Unmarshal(line, &doc); err != nil {
			return nil, err
		}
		docs = append(docs, doc)
	}
	return docs, scanner.Err()
}
