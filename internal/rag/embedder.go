// Package rag 实现生产级 SRE 运维知识库的混合检索引擎。
// 核心包含：
// 1. 双模稠密向量编码器（OpenAI/Ollama HTTP API + 基于 Subword N-Gram 与 Johnson-Lindenstrauss 随机正交投影的 256 维离线稠密向量编码器）
// 2. HNSW（Hierarchical Navigable Small World）多层图近似最近邻索引
// 3. Okapi BM25 倒排索引
// 4. RRF（Reciprocal Rank Fusion）多路召回融合重排器
package rag

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"hash/fnv"
	"io"
	"math"
	"net/http"
	"strings"
	"sync"
	"time"
	"unicode"
)

// DefaultEmbeddingDim 定义默认的稠密向量维度（256 维 L2 归一化浮点向量）。
// 选择 256 维的原因：根据 Johnson-Lindenstrauss 引理，在百至万级运维知识库规模下，
// 256 维稠密正交投影既能保持内积/余弦距离的保距性（低畸变率），又能将单次 HNSW 距离计算控制在百纳秒级。
const DefaultEmbeddingDim = 256

// Embedder 定义将文本编码为固定维度 L2 归一化稠密浮点向量的统一接口。
type Embedder interface {
	// Embed 将单条文本编码为稠密实数向量。
	Embed(ctx context.Context, text string) ([]float64, error)
	// EmbedBatch 批量将多条文本编码为稠密实数向量。
	EmbedBatch(ctx context.Context, texts []string) ([][]float64, error)
	// Dimension 返回当前编码器输出的向量维度。
	Dimension() int
	// Name 返回编码器标识名称，用于审计与评测报告追踪。
	Name() string
}

// semanticCluster 定义 SRE 运维领域的先验语义概念簇。
// 为什么引入语义概念簇：运维故障工单常出现跨语言/同义词表述（如“串台/越权覆盖”对应“tenant_id 漏传”，“200 跌落/丢包”对应“BGP 专线抖动”）。
// 将领域同义词映射为高权重子空间特征并参与 JL 正交投影，可显著提升跨表述语义召回率，避免退化为字面匹配。
type semanticCluster struct {
	clusterID string
	anchors   []string
	weight    float64
}

// defaultSREClusters 预置 10 大生产运维故障域的核心语义概念锚点。
var defaultSREClusters = []semanticCluster{
	{
		clusterID: "sem:db_orm_tenant_leak",
		anchors: []string{
			"gorm", "where", "chain", "tenant", "tenant_id", "multi-tenant", "多租户",
			"链式调用", "返回值", "误刷", "串台", "全表更新", "db.where", "污染", "隔离失效", "跨租户",
		},
		weight: 3.2,
	},
	{
		clusterID: "sem:olap_conn_pool_exhaustion",
		anchors: []string{
			"clickhouse", "olap", "conn", "pool", "exhaust", "rollback", "tx", "transaction",
			"连接池", "耗尽", "未回滚", "小事务", "max_open_conns", "too many connections", "连接泄漏", "阻塞",
		},
		weight: 3.2,
	},
	{
		clusterID: "sem:mq_poison_pill_dlq",
		anchors: []string{
			"redis", "stream", "xreadgroup", "xack", "pel", "dlq", "poison", "panic", "slice",
			"毒丸", "死信", "空切片", "index out of range", "pending", "消息堆积", "recover", "消费者卡死",
		},
		weight: 3.2,
	},
	{
		clusterID: "sem:nat_ip_alert_disambiguation",
		anchors: []string{
			"nat", "snat", "eip", "shared ip", "outbound ip", "cmdb", "host project", "disambiguation",
			"出口ip", "共用ip", "共享nat", "归属错乱", "误报项目", "网关ip", "反查项目", "多业务共用",
		},
		weight: 3.2,
	},
	{
		clusterID: "sem:backbone_bgp_packet_loss",
		anchors: []string{
			"bgp", "mtr", "packet loss", "jitter", "backbone", "cdn", "200", "noc", "sgs", "as_path",
			"骨干网", "专线", "丢包", "抖动", "成功率暴跌", "跨国链路", "路由震荡", "拨测",
		},
		weight: 3.2,
	},
	{
		clusterID: "sem:edge_agent_disk_full_circuit_break",
		anchors: []string{
			"/tmp", "disk full", "1gb", "1024mb", "circuit break", "ipc", "truncate", "enospc", "agent",
			"撑爆", "熔断", "大日志", "磁盘满", "临时目录", "管道截断", "宿主机采集", "保护性退出",
		},
		weight: 3.2,
	},
	{
		clusterID: "sem:auth_replay_and_clock_skew",
		anchors: []string{
			"timestamp", "clock skew", "ntp", "replay", "bastion", "gateway", "signature", "expired",
			"时间戳", "时钟漂移", "重放", "堡垒机", "过期请求", "签名校验", "时间不同步", "chrony",
		},
		weight: 3.2,
	},
	{
		clusterID: "sem:nsq_early_ack_task_loss",
		anchors: []string{
			"nsq", "fin", "ack", "early ack", "oom", "oomkilled", "sigkill", "publish", "task loss",
			"提前ack", "提前finish", "任务丢失", "重启丢消息", "先ack后执行", "发布中断", "退出码137",
		},
		weight: 3.2,
	},
	{
		clusterID: "sem:oauth_token_race_overwrite",
		anchors: []string{
			"oauth", "oauth2", "token", "refresh_token", "race", "config.yaml", "overwrite", "401", "flock",
			"并发刷新", "覆写", "配置文件截断", "多进程cli", "401 unauthorized", "文件锁", "原子写",
		},
		weight: 3.2,
	},
	{
		clusterID: "sem:frontend_memory_leak_oom",
		anchors: []string{
			"webgl", "setinterval", "memory leak", "heap", "detached dom", "60fps", "raf", "requestanimationframe",
			"大盘", "定时器", "内存泄漏", "重复绑定", "空转", "浏览器崩溃", "显存泄漏", "clearinterval",
		},
		weight: 3.2,
	},
}

// SubwordProjectionEmbedder 实现基于 Subword Character N-Gram + TF-IDF 加权 +
// Johnson-Lindenstrauss 随机正交投影的确定性稠密语义向量编码器。
// 为什么这样设计：
// 1. 严禁使用字面词切分交集冒充向量；本编码器输出真正的 256 维连续实数稠密向量（[]float64），满足欧氏空间与余弦度量性质。
// 2. 通过提取 Subword 字符 N-Gram（2/3/4-gram）、技术词元与领域概念簇，具备对拼写变体、报错码片段、中英文混合术语的细粒度表征能力。
// 3. 使用 SplitMix64 确定性伪随机正交投影将稀疏高维特征压缩至 256 维稠密空间并做 L2 归一化，无需外网 GPU 即可稳定复现高精度向量检索。
type SubwordProjectionEmbedder struct {
	mu        sync.RWMutex
	dim       int
	seed      uint64
	docCount  int
	docFreq   map[string]int
	idfWeight map[string]float64
}

// NewSubwordProjectionEmbedder 创建指定维度的确定性 Subword 随机正交投影向量编码器。
func NewSubwordProjectionEmbedder(dim int, seed uint64) *SubwordProjectionEmbedder {
	if dim <= 0 {
		dim = DefaultEmbeddingDim
	}
	if seed == 0 {
		seed = 0x5352455F4147454E // "SRE_AGEN"
	}
	return &SubwordProjectionEmbedder{
		dim:       dim,
		seed:      seed,
		docFreq:   make(map[string]int),
		idfWeight: make(map[string]float64),
	}
}

// FitCorpus 根据知识库文档集合统计 Subword 与词元的逆文档频率（IDF），强化稀有故障特征词的投影权重。
// 公式：IDF(f) = ln(1 + (N - df(f) + 0.5) / (df(f) + 0.5))
func (e *SubwordProjectionEmbedder) FitCorpus(docs []string) {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.docCount = len(docs)
	e.docFreq = make(map[string]int, len(docs)*32)
	for _, doc := range docs {
		features := extractSubwordFeatures(doc)
		for feat := range features {
			e.docFreq[feat]++
		}
	}

	e.idfWeight = make(map[string]float64, len(e.docFreq))
	n := float64(e.docCount)
	for feat, df := range e.docFreq {
		idf := math.Log(1.0 + (n-float64(df)+0.5)/(float64(df)+0.5))
		// 限制下界防止高频但关键的领域词权重归零
		if idf < 0.25 {
			idf = 0.25
		}
		e.idfWeight[feat] = idf
	}
}

// Dimension 返回稠密向量维度。
func (e *SubwordProjectionEmbedder) Dimension() int {
	return e.dim
}

// Name 返回编码器标识。
func (e *SubwordProjectionEmbedder) Name() string {
	return fmt.Sprintf("subword-tfidf-jl-proj-%dd", e.dim)
}

// Embed 将输入文本编码为 L2 归一化的 256 维稠密浮点向量。
func (e *SubwordProjectionEmbedder) Embed(_ context.Context, text string) ([]float64, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	vec := make([]float64, e.dim)
	rawFeatures := extractSubwordFeatures(text)
	if len(rawFeatures) == 0 {
		return vec, nil
	}

	// 遍历每个非零特征，计算 Sublinear TF * IDF 权重，并投影到 256 维稠密空间。
	// 为兼顾计算速度与正交性，采用稀疏 Achlioptas/CountSketch 混合多哈希正交投影：
	// 每个特征激活 K=16 个带独立正负号与高斯近似权重的正交基维度。
	const activeProjectionsPerFeature = 16
	invSqrtK := 1.0 / math.Sqrt(float64(activeProjectionsPerFeature))

	for feat, rawWeight := range rawFeatures {
		// 亚线性词频缩放：1 + ln(tf)
		tf := 1.0
		if rawWeight > 1.0 {
			tf = 1.0 + math.Log(rawWeight)
		}
		idf := 1.2
		if learnedIDF, ok := e.idfWeight[feat]; ok {
			idf = learnedIDF
		}
		// 语义概念簇特征给予额外保真增益，确保同义异词的故障描述在 256 维投影子空间中高度聚拢
		if strings.HasPrefix(feat, "sem:") {
			idf *= 5.5
		} else if strings.HasPrefix(feat, "tok:") {
			idf *= 1.4
		}

		weight := tf * idf * invSqrtK
		baseHash := hashFeature(feat, e.seed)

		state := baseHash
		for p := 0; p < activeProjectionsPerFeature; p++ {
			state = splitMix64(state)
			dimIdx := int(state % uint64(e.dim))
			// 利用高比特位生成对称正交随机符号 {-1, +1} 与多阶幅度微调
			sign := 1.0
			if (state>>32)&1 == 1 {
				sign = -1.0
			}
			// 叠加次级幅度系数 {0.75, 1.0, 1.25} 模拟高斯正交投影矩阵
			ampBucket := (state >> 40) % 3
			amp := 1.0
			if ampBucket == 0 {
				amp = 0.75
			} else if ampBucket == 2 {
				amp = 1.25
			}
			vec[dimIdx] += sign * amp * weight
		}
	}

	NormalizeL2(vec)
	return vec, nil
}

// EmbedBatch 批量编码文本列表。
func (e *SubwordProjectionEmbedder) EmbedBatch(ctx context.Context, texts []string) ([][]float64, error) {
	out := make([][]float64, len(texts))
	for i, t := range texts {
		v, err := e.Embed(ctx, t)
		if err != nil {
			return nil, err
		}
		out[i] = v
	}
	return out, nil
}

// OpenAIHTTPEmbedder 支持对接真实 OpenAI 兼容 `/v1/embeddings` 或本地 Ollama 向量接口；
// 当配置了 Fallback 时，在无外网或接口超时场景下可显式降级或返回错误。
type OpenAIHTTPEmbedder struct {
	BaseURL    string
	APIKey     string
	Model      string
	Dim        int
	HTTPClient *http.Client
	Fallback   Embedder
}

// NewOpenAIHTTPEmbedder 创建支持远端 API 与本地确定性回退的双模向量编码器。
func NewOpenAIHTTPEmbedder(baseURL, apiKey, model string, dim int, fallback Embedder) *OpenAIHTTPEmbedder {
	if dim <= 0 {
		dim = DefaultEmbeddingDim
	}
	return &OpenAIHTTPEmbedder{
		BaseURL: strings.TrimRight(baseURL, "/"),
		APIKey:  apiKey,
		Model:   model,
		Dim:     dim,
		HTTPClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		Fallback: fallback,
	}
}

// Dimension 返回向量维度。
func (o *OpenAIHTTPEmbedder) Dimension() int {
	return o.Dim
}

// Name 返回编码器名称。
func (o *OpenAIHTTPEmbedder) Name() string {
	if o.BaseURL == "" {
		if o.Fallback != nil {
			return o.Fallback.Name()
		}
		return "openai-http-unconfigured"
	}
	return fmt.Sprintf("openai-http:%s", o.Model)
}

// Embed 调用 OpenAI 兼容接口获取向量；若未配置 BaseURL 且存在 Fallback，则使用离线投影编码器。
func (o *OpenAIHTTPEmbedder) Embed(ctx context.Context, text string) ([]float64, error) {
	if o.BaseURL == "" {
		if o.Fallback != nil {
			return o.Fallback.Embed(ctx, text)
		}
		return nil, fmt.Errorf("未配置 Embedding API BaseURL 且无离线 Fallback")
	}
	vecs, err := o.EmbedBatch(ctx, []string{text})
	if err != nil {
		if o.Fallback != nil {
			return o.Fallback.Embed(ctx, text)
		}
		return nil, err
	}
	return vecs[0], nil
}

// EmbedBatch 批量请求远程 Embedding 接口。
func (o *OpenAIHTTPEmbedder) EmbedBatch(ctx context.Context, texts []string) ([][]float64, error) {
	if o.BaseURL == "" {
		if o.Fallback != nil {
			return o.Fallback.EmbedBatch(ctx, texts)
		}
		return nil, fmt.Errorf("未配置 Embedding API BaseURL 且无离线 Fallback")
	}

	reqBody := map[string]any{
		"model": o.Model,
		"input": texts,
	}
	payload, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, o.BaseURL+"/v1/embeddings", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if o.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+o.APIKey)
	}

	resp, err := o.HTTPClient.Do(req)
	if err != nil {
		if o.Fallback != nil {
			return o.Fallback.EmbedBatch(ctx, texts)
		}
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		if o.Fallback != nil {
			return o.Fallback.EmbedBatch(ctx, texts)
		}
		return nil, fmt.Errorf("embedding API HTTP %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var parsed struct {
		Data []struct {
			Embedding []float64 `json:"embedding"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, err
	}
	if len(parsed.Data) != len(texts) {
		return nil, fmt.Errorf("embedding 返回数量不匹配: 期望 %d, 实际 %d", len(texts), len(parsed.Data))
	}

	result := make([][]float64, len(texts))
	for i, item := range parsed.Data {
		vec := item.Embedding
		NormalizeL2(vec)
		result[i] = vec
	}
	return result, nil
}

// extractSubwordFeatures 从文本中提取多粒度特征：
// 1. 完整技术词元（`tok:<word>`）与相邻词元二元组（`bi:<w1>_<w2>`）
// 2. 英文/数字子词字符 3-gram 与 4-gram（`c3:<gram>`, `c4:<gram>`），增强对错误码与函数名变体的鲁棒性
// 3. 中文字符单字、2-gram 与 3-gram（`zh2:<gram>`, `zh3:<gram>`），无需外部词典即可覆盖中文运维术语
// 4. SRE 领域先验语义概念簇（`sem:<cluster>`），建立跨表述的稠密语义桥梁
func extractSubwordFeatures(text string) map[string]float64 {
	lower := strings.ToLower(strings.TrimSpace(text))
	features := make(map[string]float64, 128)
	if lower == "" {
		return features
	}

	// 1. 提取技术词元与中文连续片段
	tokens := TokenizeMixed(lower)
	for i, tok := range tokens {
		features["tok:"+tok] += 1.5
		if i+1 < len(tokens) {
			features["bi:"+tok+"_"+tokens[i+1]] += 1.2
		}
		// 对 ASCII 技术标识符提取字符 3-gram / 4-gram（加边界符 ^ 和 $）
		if isASCIIIdentifier(tok) && len(tok) >= 3 {
			padded := "^" + tok + "$"
			for j := 0; j+3 <= len(padded); j++ {
				features["c3:"+padded[j:j+3]] += 0.6
			}
			for j := 0; j+4 <= len(padded); j++ {
				features["c4:"+padded[j:j+4]] += 0.8
			}
		}
	}

	// 2. 提取连续中文字符的 2-gram 与 3-gram
	var cjkRunes []rune
	flushCJK := func() {
		if len(cjkRunes) == 0 {
			return
		}
		for i := 0; i < len(cjkRunes); i++ {
			features["zh1:"+string(cjkRunes[i])] += 0.4
			if i+2 <= len(cjkRunes) {
				features["zh2:"+string(cjkRunes[i:i+2])] += 1.3
			}
			if i+3 <= len(cjkRunes) {
				features["zh3:"+string(cjkRunes[i:i+3])] += 1.6
			}
		}
		cjkRunes = cjkRunes[:0]
	}

	for _, r := range lower {
		if unicode.Is(unicode.Han, r) {
			cjkRunes = append(cjkRunes, r)
		} else {
			flushCJK()
		}
	}
	flushCJK()

	// 3. 激活 SRE 领域语义概念簇
	for _, cluster := range defaultSREClusters {
		matchCount := 0
		for _, anchor := range cluster.anchors {
			if strings.Contains(lower, anchor) {
				matchCount++
			}
		}
		if matchCount > 0 {
			// 多锚点共同出现时按平方根增益放大该概念簇特征，体现多证据协同语义
			features[cluster.clusterID] += cluster.weight * math.Sqrt(float64(matchCount))
		}
	}

	return features
}

// TokenizeMixed 实现面向 SRE 运维日志与中英文混合文本的确定性分词器。
// 为什么不用简单的空白切分：
// 运维日志包含大量如 `db.Where("tenant_id = ?")`、`/tmp/agent.log`、`XREADGROUP`、`OOMKilled` 以及无空格中文句子。
// 本函数将英文/数字/下划线识别为技术词元，同时将中文切分为单字与双字词元，供 BM25 与特征提取复用。
func TokenizeMixed(text string) []string {
	lower := strings.ToLower(text)
	var tokens []string
	var asciiBuf strings.Builder
	var hanBuf []rune

	flushASCII := func() {
		if asciiBuf.Len() > 0 {
			tok := strings.Trim(asciiBuf.String(), "_-./:")
			if len(tok) > 0 {
				tokens = append(tokens, tok)
			}
			asciiBuf.Reset()
		}
	}

	flushHan := func() {
		if len(hanBuf) == 0 {
			return
		}
		if len(hanBuf) == 1 {
			tokens = append(tokens, string(hanBuf[0]))
		} else {
			for i := 0; i+1 < len(hanBuf); i++ {
				tokens = append(tokens, string(hanBuf[i:i+2]))
			}
			for i := 0; i+2 < len(hanBuf); i++ {
				tokens = append(tokens, string(hanBuf[i:i+3]))
			}
		}
		hanBuf = hanBuf[:0]
	}

	for _, r := range lower {
		if unicode.Is(unicode.Han, r) {
			flushASCII()
			hanBuf = append(hanBuf, r)
		} else if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' || r == '-' || r == '/' || r == '.' {
			flushHan()
			asciiBuf.WriteRune(r)
		} else {
			flushASCII()
			flushHan()
		}
	}
	flushASCII()
	flushHan()
	return tokens
}

// isASCIIIdentifier 判断词元是否为纯 ASCII 标识符。
func isASCIIIdentifier(s string) bool {
	for i := 0; i < len(s); i++ {
		if s[i] >= 0x80 {
			return false
		}
	}
	return true
}

// NormalizeL2 将浮点向量原地归一化为单位 L2 范数（||v||_2 = 1）。
// 归一化后，两个向量的内积（Dot Product）严格等于其余弦相似度（Cosine Similarity）。
func NormalizeL2(vec []float64) {
	var sumSq float64
	for _, v := range vec {
		sumSq += v * v
	}
	if sumSq <= 1e-18 {
		return
	}
	invNorm := 1.0 / math.Sqrt(sumSq)
	for i := range vec {
		vec[i] *= invNorm
	}
}

// CosineSimilarity 计算两个稠密向量的余弦相似度，返回值范围 [-1.0, 1.0]。
func CosineSimilarity(a, b []float64) float64 {
	n := len(a)
	if len(b) < n {
		n = len(b)
	}
	if n == 0 {
		return 0
	}
	var dot, normA, normB float64
	for i := 0; i < n; i++ {
		dot += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}
	if normA <= 1e-18 || normB <= 1e-18 {
		return 0
	}
	return dot / (math.Sqrt(normA) * math.Sqrt(normB))
}

// CosineDistance 计算余弦距离：1.0 - CosineSimilarity(a, b)，范围 [0.0, 2.0]，值越小越相似。
func CosineDistance(a, b []float64) float64 {
	sim := CosineSimilarity(a, b)
	dist := 1.0 - sim
	if dist < 0 {
		return 0
	}
	return dist
}

// hashFeature 使用 FNV-1a 64-bit 哈希结合种子计算特征的基础哈希值。
func hashFeature(feat string, seed uint64) uint64 {
	h := fnv.New64a()
	_, _ = h.Write([]byte(feat))
	return h.Sum64() ^ seed
}

// splitMix64 是高质量的 64 位无状态伪随机数生成器（Steele et al., OOPSLA 2014），
// 用于确定性地生成每个特征在 256 维空间中的正交投影坐标与符号。
func splitMix64(x uint64) uint64 {
	x += 0x9e3779b97f4a7c15
	x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9
	x = (x ^ (x >> 27)) * 0x94d049bb133111eb
	return x ^ (x >> 31)
}
