package rag

import (
	"math"
	"sort"
	"strings"
	"sync"
)

// BM25Config 定义 Okapi BM25 概率检索模型的超参数。
type BM25Config struct {
	// K1 控制词频饱和度（Term Frequency Saturation），典型值 1.2 ~ 2.0，默认 1.5。
	K1 float64 `json:"k1"`
	// B 控制文档长度归一化强度（Document Length Normalization），范围 [0, 1]，默认 0.75。
	B float64 `json:"b"`
}

// DefaultBM25Config 返回标准 Okapi BM25 参数配置。
func DefaultBM25Config() BM25Config {
	return BM25Config{
		K1: 1.5,
		B:  0.75,
	}
}

// postingEntry 记录倒排链表中某个词元在单篇文档中的出现频次（TF）。
type postingEntry struct {
	docIdx int
	tf     int
}

// BM25SearchResult 表示 BM25 倒排检索的单个命中文档及得分。
type BM25SearchResult struct {
	DocID        string   `json:"doc_id"`
	Score        float64  `json:"score"`
	MatchedTerms []string `json:"matched_terms"`
}

// BM25Index 实现标准 Okapi BM25 倒排索引。
// 为什么在拥有 HNSW 稠密向量检索后仍需叠加 BM25：
// 运维场景包含大量精确标识符（如特定错误码 `Code: 202`、SQL 表名、CLI 子命令 `host project`、IP 段）。
// 稠密向量擅长跨表述语义泛化，而 BM25 擅长高 IDF 稀有标识符的精确匹配，二者通过 RRF 融合可实现互补。
type BM25Index struct {
	mu          sync.RWMutex
	cfg         BM25Config
	docIDs      []string
	docLengths  []int
	totalLength int
	avgDocLen   float64
	postings    map[string][]postingEntry
}

// NewBM25Index 创建一个空的 Okapi BM25 倒排索引。
func NewBM25Index(cfg BM25Config) *BM25Index {
	if cfg.K1 <= 0 {
		cfg = DefaultBM25Config()
	}
	return &BM25Index{
		cfg:      cfg,
		postings: make(map[string][]postingEntry, 512),
	}
}

// Add 将一篇文档分词后写入 BM25 倒排表，并实时更新平均文档长度 avgdl。
func (b *BM25Index) Add(docID string, text string) {
	b.mu.Lock()
	defer b.mu.Unlock()

	tokens := TokenizeMixed(text)
	docIdx := len(b.docIDs)
	b.docIDs = append(b.docIDs, docID)
	b.docLengths = append(b.docLengths, len(tokens))
	b.totalLength += len(tokens)
	b.avgDocLen = float64(b.totalLength) / float64(len(b.docIDs))

	tfMap := make(map[string]int, len(tokens))
	for _, tok := range tokens {
		tfMap[tok]++
	}
	for term, tf := range tfMap {
		b.postings[term] = append(b.postings[term], postingEntry{
			docIdx: docIdx,
			tf:     tf,
		})
	}
}

// Search 执行标准 Okapi BM25 检索打分并返回 Top-K 结果。
// 评分公式：
// Score(D, Q) = \sum_{q \in Q} \ln(1 + (N - df(q) + 0.5)/(df(q) + 0.5)) * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * |D| / avgdl)))
func (b *BM25Index) Search(query string, topK int) []BM25SearchResult {
	b.mu.RLock()
	defer b.mu.RUnlock()

	nDocs := len(b.docIDs)
	if nDocs == 0 || topK <= 0 {
		return nil
	}

	qTokens := uniqueTokens(TokenizeMixed(query))
	if len(qTokens) == 0 {
		return nil
	}

	scores := make(map[int]float64, nDocs)
	matched := make(map[int][]string, nDocs)
	avgDL := b.avgDocLen
	if avgDL <= 0 {
		avgDL = 1.0
	}

	for _, term := range qTokens {
		plist, ok := b.postings[term]
		if !ok || len(plist) == 0 {
			continue
		}
		df := float64(len(plist))
		idf := math.Log(1.0 + (float64(nDocs)-df+0.5)/(df+0.5))

		for _, entry := range plist {
			dl := float64(b.docLengths[entry.docIdx])
			tf := float64(entry.tf)
			normFactor := 1.0 - b.cfg.B + b.cfg.B*(dl/avgDL)
			termScore := idf * ((tf * (b.cfg.K1 + 1.0)) / (tf + b.cfg.K1*normFactor))
			scores[entry.docIdx] += termScore
			matched[entry.docIdx] = append(matched[entry.docIdx], term)
		}
	}

	results := make([]BM25SearchResult, 0, len(scores))
	for docIdx, sc := range scores {
		results = append(results, BM25SearchResult{
			DocID:        b.docIDs[docIdx],
			Score:        sc,
			MatchedTerms: matched[docIdx],
		})
	}

	sort.Slice(results, func(i, j int) bool {
		if math.Abs(results[i].Score-results[j].Score) < 1e-12 {
			return results[i].DocID < results[j].DocID
		}
		return results[i].Score > results[j].Score
	})

	if len(results) > topK {
		results = results[:topK]
	}
	return results
}

// SearchNaiveLexical 仅按粗粒度字面词交集计数（无 Subword、无 IDF 加权、无长度归一化、无稠密向量），
// 专门用于消融实验中的 `Baseline-Lexical` 传统基线对比，直观暴露纯字面匹配在同义表述与表象干扰下的缺陷。
func SearchNaiveLexical(docs []KnowledgeDocument, query string, topK int) []BM25SearchResult {
	qWords := simpleWhitespaceWords(query)
	results := make([]BM25SearchResult, 0, len(docs))

	for _, doc := range docs {
		// 传统字面基线仅匹配标题与表层症状关键词
		surface := strings.ToLower(doc.Title + " " + strings.Join(doc.Tags, " ") + " " + doc.SymptomSummary)
		var overlap float64
		var matched []string
		for _, w := range qWords {
			if len(w) < 2 {
				continue
			}
			if strings.Contains(surface, w) {
				overlap += 1.0
				matched = append(matched, w)
			}
		}
		if overlap > 0 {
			results = append(results, BM25SearchResult{
				DocID:        doc.ID,
				Score:        overlap / math.Sqrt(float64(len(qWords)+4)),
				MatchedTerms: matched,
			})
		}
	}

	sort.Slice(results, func(i, j int) bool {
		if math.Abs(results[i].Score-results[j].Score) < 1e-12 {
			return results[i].DocID < results[j].DocID
		}
		return results[i].Score > results[j].Score
	})
	if len(results) > topK {
		results = results[:topK]
	}
	return results
}

func uniqueTokens(tokens []string) []string {
	seen := make(map[string]bool, len(tokens))
	out := make([]string, 0, len(tokens))
	for _, t := range tokens {
		if !seen[t] {
			seen[t] = true
			out = append(out, t)
		}
	}
	return out
}

func simpleWhitespaceWords(s string) []string {
	lower := strings.ToLower(s)
	replacer := strings.NewReplacer(
		"，", " ", "。", " ", "：", " ", "；", " ", "（", " ", "）", " ",
		",", " ", ".", " ", ":", " ", ";", " ", "(", " ", ")", " ",
		"[", " ", "]", " ", "{", " ", "}", " ", "\"", " ", "'", " ",
	)
	cleaned := replacer.Replace(lower)
	return uniqueTokens(strings.Fields(cleaned))
}
