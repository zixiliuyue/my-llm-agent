package rag

import (
	"container/heap"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"os"
	"sort"
	"sync"
)

// HNSWConfig 定义 HNSW（Hierarchical Navigable Small World）多层图索引的超参数。
// 参考论文：Malkov & Yashunin, "Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs", TPAMI 2018.
type HNSWConfig struct {
	// M 是除第 0 层外每个节点在单层维护的最大双向邻居数（典型值 16）。
	M int `json:"m"`
	// Mmax0 是第 0 层（最稠密基础层）每个节点允许的最大邻居数，通常设为 2 * M。
	Mmax0 int `json:"m_max0"`
	// EfConstruction 是建图插入阶段候选动态列表的束搜索宽度（典型值 64~200），越大建图质量越高。
	EfConstruction int `json:"ef_construction"`
	// EfSearch 是查询阶段候选优先队列的束搜索宽度（典型值 32~128），决定召回率与延迟的权衡。
	EfSearch int `json:"ef_search"`
	// LevelMult 是指数衰减层高分配因子 m_L = 1 / ln(M)，控制节点跨层跳表概率。
	LevelMult float64 `json:"level_mult"`
	// Seed 是层高采样伪随机数种子，确保离线评测索引构建 100% 可复现。
	Seed int64 `json:"seed"`
}

// DefaultHNSWConfig 返回针对生产级 SRE 知识库调优的默认 HNSW 参数。
func DefaultHNSWConfig() HNSWConfig {
	m := 16
	return HNSWConfig{
		M:              m,
		Mmax0:          m * 2,
		EfConstruction: 96,
		EfSearch:       48,
		LevelMult:      1.0 / math.Log(float64(m)),
		Seed:           20261014,
	}
}

// HNSWNode 表示 HNSW 多层图中的单个向量节点及其在各层的邻接表。
type HNSWNode struct {
	InternalID int         `json:"internal_id"`
	DocID      string      `json:"doc_id"`
	Vector     []float64   `json:"vector"`
	MaxLayer   int         `json:"max_layer"`
	Friends    [][]int     `json:"friends"` // Friends[layer] 存储该节点在第 layer 层的邻居 InternalID 列表
	Metadata   map[string]string `json:"metadata,omitempty"`
}

// HNSWSearchResult 表示 HNSW 图搜索返回的单个近邻命中结果。
type HNSWSearchResult struct {
	InternalID  int               `json:"internal_id"`
	DocID       string            `json:"doc_id"`
	Distance    float64           `json:"distance"`    // 余弦距离 = 1 - CosineSimilarity
	Similarity  float64           `json:"similarity"`  // 余弦相似度 = 1 - Distance
	VisitedHops int               `json:"visited_hops"` // 图遍历计算距离的节点跳数
	Metadata    map[string]string `json:"metadata,omitempty"`
}

// HNSWIndex 实现真正的 Hierarchical Navigable Small World 多层可导航小世界图索引。
// 为什么在运维 RAG 中手写完整的 HNSW 图结构：
// 1. 相比暴力线性扫描 O(N·D)，HNSW 通过高层稀疏长边快速逼近目标区域、底层稠密短边精细搜索，将查询复杂度降至 O(log N)。
// 2. 支持启发式多样化选边（Heuristic Neighbor Selection），当知识库存在大量同类别近似文档时，避免局部簇孤岛化。
// 3. 纯 Go 内存图结构 + JSON 快照落盘，零 CGO 依赖即可在单机或容器内毫秒级启动。
type HNSWIndex struct {
	mu         sync.RWMutex
	cfg        HNSWConfig
	nodes      []*HNSWNode
	docIDToIdx map[string]int
	entryPoint int
	maxLayer   int
	rng        *rand.Rand
}

// NewHNSWIndex 创建一个空的 HNSW 多层图索引。
func NewHNSWIndex(cfg HNSWConfig) *HNSWIndex {
	if cfg.M <= 0 {
		cfg = DefaultHNSWConfig()
	}
	if cfg.Mmax0 <= 0 {
		cfg.Mmax0 = cfg.M * 2
	}
	if cfg.EfConstruction <= 0 {
		cfg.EfConstruction = 96
	}
	if cfg.EfSearch <= 0 {
		cfg.EfSearch = 48
	}
	if cfg.LevelMult <= 0 {
		cfg.LevelMult = 1.0 / math.Log(float64(cfg.M))
	}
	return &HNSWIndex{
		cfg:        cfg,
		nodes:      make([]*HNSWNode, 0, 128),
		docIDToIdx: make(map[string]int, 128),
		entryPoint: -1,
		maxLayer:   -1,
		rng:        rand.New(rand.NewSource(cfg.Seed)),
	}
}

// Size 返回当前 HNSW 图索引中的向量节点总数。
func (h *HNSWIndex) Size() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.nodes)
}

// MaxLayer 返回当前图索引的最高层级编号。
func (h *HNSWIndex) MaxLayer() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.maxLayer
}

// randomLevel 按指数衰减分布采样新节点的最高层级 l = floor(-ln(uniform(0,1)) * m_L)。
// 保证第 l 层的节点数量按 M^(-l) 指数递减，形成类似跳表（SkipList）的分层金字塔结构。
func (h *HNSWIndex) randomLevel() int {
	u := h.rng.Float64()
	if u < 1e-12 {
		u = 1e-12
	}
	lvl := int(math.Floor(-math.Log(u) * h.cfg.LevelMult))
	if lvl > 16 {
		lvl = 16
	}
	return lvl
}

// Add 向 HNSW 多层图中插入一个稠密向量节点，遵循论文 Algorithm 1 (INSERT)。
func (h *HNSWIndex) Add(docID string, vector []float64, metadata map[string]string) error {
	if len(vector) == 0 {
		return fmt.Errorf("HNSW Add 失败: 向量维度不能为空 (docID=%s)", docID)
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	vecCopy := make([]float64, len(vector))
	copy(vecCopy, vector)
	NormalizeL2(vecCopy)

	level := h.randomLevel()
	internalID := len(h.nodes)
	friends := make([][]int, level+1)
	for l := 0; l <= level; l++ {
		friends[l] = make([]int, 0, h.cfg.M+1)
	}

	node := &HNSWNode{
		InternalID: internalID,
		DocID:      docID,
		Vector:     vecCopy,
		MaxLayer:   level,
		Friends:    friends,
		Metadata:   metadata,
	}
	h.nodes = append(h.nodes, node)
	h.docIDToIdx[docID] = internalID

	// 若是首个节点，直接设为全局入口点（entryPoint）
	if h.entryPoint < 0 {
		h.entryPoint = internalID
		h.maxLayer = level
		return nil
	}

	currObj := h.entryPoint
	currDist := CosineDistance(vecCopy, h.nodes[currObj].Vector)

	// 阶段 1：从最高层 maxLayer 向下贪婪路由至 level+1 层（每层等效 ef=1 搜索最近单点）
	for lc := h.maxLayer; lc > level; lc-- {
		changed := true
		for changed {
			changed = false
			for _, friendID := range h.nodes[currObj].Friends[lc] {
				d := CosineDistance(vecCopy, h.nodes[friendID].Vector)
				if d < currDist {
					currDist = d
					currObj = friendID
					changed = true
				}
			}
		}
	}

	// 阶段 2：从 min(maxLayer, level) 向下逐层执行 efConstruction 束搜索并建立双向连接
	topConnectLayer := level
	if h.maxLayer < topConnectLayer {
		topConnectLayer = h.maxLayer
	}

	epCandidates := []distItem{{id: currObj, dist: currDist}}
	for lc := topConnectLayer; lc >= 0; lc-- {
		candidates, _ := h.searchLayerLocked(vecCopy, epCandidates, h.cfg.EfConstruction, lc)
		maxM := h.cfg.M
		if lc == 0 {
			maxM = h.cfg.Mmax0
		}

		// 使用启发式算法（Algorithm 4 SELECT-NEIGHBORS-HEURISTIC）挑选兼顾距离与空间方向多样性的邻居
		selected := h.selectNeighborsHeuristicLocked(vecCopy, candidates, h.cfg.M)
		node.Friends[lc] = append(node.Friends[lc], selected...)

		// 添加反向边，并在邻居度数超出上限 maxM 时触发启发式度剪枝
		for _, neighborID := range selected {
			neighbor := h.nodes[neighborID]
			if !containsInt(neighbor.Friends[lc], internalID) {
				neighbor.Friends[lc] = append(neighbor.Friends[lc], internalID)
			}
			if len(neighbor.Friends[lc]) > maxM {
				neighCand := make([]distItem, 0, len(neighbor.Friends[lc]))
				for _, fID := range neighbor.Friends[lc] {
					neighCand = append(neighCand, distItem{
						id:   fID,
						dist: CosineDistance(neighbor.Vector, h.nodes[fID].Vector),
					})
				}
				neighbor.Friends[lc] = h.selectNeighborsHeuristicLocked(neighbor.Vector, neighCand, maxM)
			}
		}

		// 下一层搜索以前一层发现的所有近邻候选作为入口点集合
		epCandidates = candidates
	}

	// 若新节点采样层级高于当前全局最高层，则提升全局入口点
	if level > h.maxLayer {
		h.maxLayer = level
		h.entryPoint = internalID
	}

	return nil
}

// Search 在 HNSW 多层图中执行 K-NN 近似最近邻搜索，遵循论文 Algorithm 5 (K-NN-SEARCH)。
func (h *HNSWIndex) Search(queryVec []float64, topK int, efSearch int) []HNSWSearchResult {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if len(h.nodes) == 0 || topK <= 0 || h.entryPoint < 0 {
		return nil
	}

	q := make([]float64, len(queryVec))
	copy(q, queryVec)
	NormalizeL2(q)

	if efSearch <= 0 {
		efSearch = h.cfg.EfSearch
	}
	if efSearch < topK {
		efSearch = topK
	}

	currObj := h.entryPoint
	currDist := CosineDistance(q, h.nodes[currObj].Vector)
	totalHops := 1

	// 阶段 1：从顶层 maxLayer 贪婪下降到第 1 层
	for lc := h.maxLayer; lc >= 1; lc-- {
		changed := true
		for changed {
			changed = false
			for _, friendID := range h.nodes[currObj].Friends[lc] {
				totalHops++
				d := CosineDistance(q, h.nodes[friendID].Vector)
				if d < currDist {
					currDist = d
					currObj = friendID
					changed = true
				}
			}
		}
	}

	// 阶段 2：在第 0 层以 currObj 为入口点执行宽度为 efSearch 的优先队列束搜索
	ep := []distItem{{id: currObj, dist: currDist}}
	candidates, hops0 := h.searchLayerLocked(q, ep, efSearch, 0)
	totalHops += hops0

	sort.Slice(candidates, func(i, j int) bool {
		if math.Abs(candidates[i].dist-candidates[j].dist) < 1e-12 {
			return candidates[i].id < candidates[j].id
		}
		return candidates[i].dist < candidates[j].dist
	})

	if len(candidates) > topK {
		candidates = candidates[:topK]
	}

	results := make([]HNSWSearchResult, len(candidates))
	for i, c := range candidates {
		n := h.nodes[c.id]
		results[i] = HNSWSearchResult{
			InternalID:  n.InternalID,
			DocID:       n.DocID,
			Distance:    c.dist,
			Similarity:  1.0 - c.dist,
			VisitedHops: totalHops,
			Metadata:    n.Metadata,
		}
	}
	return results
}

// BruteForceSearch 执行精确线性全量余弦距离搜索，用于单元测试计算 HNSW Recall@K 召回率基线。
func (h *HNSWIndex) BruteForceSearch(queryVec []float64, topK int) []HNSWSearchResult {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if len(h.nodes) == 0 || topK <= 0 {
		return nil
	}
	q := make([]float64, len(queryVec))
	copy(q, queryVec)
	NormalizeL2(q)

	items := make([]distItem, len(h.nodes))
	for i, n := range h.nodes {
		items[i] = distItem{
			id:   n.InternalID,
			dist: CosineDistance(q, n.Vector),
		}
	}
	sort.Slice(items, func(i, j int) bool {
		if math.Abs(items[i].dist-items[j].dist) < 1e-12 {
			return items[i].id < items[j].id
		}
		return items[i].dist < items[j].dist
	})
	if len(items) > topK {
		items = items[:topK]
	}
	results := make([]HNSWSearchResult, len(items))
	for i, item := range items {
		n := h.nodes[item.id]
		results[i] = HNSWSearchResult{
			InternalID:  n.InternalID,
			DocID:       n.DocID,
			Distance:    item.dist,
			Similarity:  1.0 - item.dist,
			VisitedHops: len(h.nodes),
			Metadata:    n.Metadata,
		}
	}
	return results
}

// searchLayerLocked 实现 HNSW 论文 Algorithm 2 (SEARCH-LAYER)。
// 维护两个优先队列：
// - candidateMinHeap：按距离从小到大弹出待扩展的最近候选节点 C
// - resultMaxHeap：按距离从大到小维护当前已找到的前 ef 个最佳节点 W（堆顶为 W 中最远节点 f）
func (h *HNSWIndex) searchLayerLocked(queryVec []float64, entryPoints []distItem, ef int, layer int) ([]distItem, int) {
	visited := make(map[int]bool, ef*4)
	candHeap := &minDistHeap{}
	resHeap := &maxDistHeap{}
	heap.Init(candHeap)
	heap.Init(resHeap)

	for _, ep := range entryPoints {
		if visited[ep.id] {
			continue
		}
		visited[ep.id] = true
		heap.Push(candHeap, ep)
		heap.Push(resHeap, ep)
		if resHeap.Len() > ef {
			heap.Pop(resHeap)
		}
	}

	hops := 0
	for candHeap.Len() > 0 {
		closest := heap.Pop(candHeap).(distItem)
		furthestInRes := (*resHeap)[0]

		// 若待扩展最近节点比当前结果集中最远节点还要远，且结果集已满 ef，则终止束搜索
		if closest.dist > furthestInRes.dist && resHeap.Len() >= ef {
			break
		}

		node := h.nodes[closest.id]
		if layer >= len(node.Friends) {
			continue
		}
		for _, friendID := range node.Friends[layer] {
			if visited[friendID] {
				continue
			}
			visited[friendID] = true
			hops++
			d := CosineDistance(queryVec, h.nodes[friendID].Vector)
			furthest := (*resHeap)[0]
			if resHeap.Len() < ef || d < furthest.dist {
				item := distItem{id: friendID, dist: d}
				heap.Push(candHeap, item)
				heap.Push(resHeap, item)
				if resHeap.Len() > ef {
					heap.Pop(resHeap)
				}
			}
		}
	}

	out := make([]distItem, resHeap.Len())
	for i := len(out) - 1; i >= 0; i-- {
		out[i] = heap.Pop(resHeap).(distItem)
	}
	return out, hops
}

// selectNeighborsHeuristicLocked 实现 HNSW 论文 Algorithm 4 (SELECT-NEIGHBORS-HEURISTIC)。
// 为什么用启发式选边代替简单取最近 M 个：
// 若所有邻居都集中在同一方向簇内，跨簇导航边会断裂。启发式选边要求新候选节点 e 到目标点 q 的距离
// 小于 e 到任何已选邻居 r 的距离，否则先放入 discarded 队列，仅在不足 M 个时补齐，保证图的全局连通性。
func (h *HNSWIndex) selectNeighborsHeuristicLocked(baseVec []float64, candidates []distItem, m int) []int {
	if len(candidates) == 0 || m <= 0 {
		return nil
	}
	sorted := make([]distItem, len(candidates))
	copy(sorted, candidates)
	sort.Slice(sorted, func(i, j int) bool {
		if math.Abs(sorted[i].dist-sorted[j].dist) < 1e-12 {
			return sorted[i].id < sorted[j].id
		}
		return sorted[i].dist < sorted[j].dist
	})

	selected := make([]int, 0, m)
	discarded := make([]int, 0, len(sorted))
	seen := make(map[int]bool, len(sorted))

	for _, cand := range sorted {
		if seen[cand.id] {
			continue
		}
		seen[cand.id] = true
		if len(selected) >= m {
			break
		}

		// 检查 cand 是否比任何已选邻居更接近某个方向簇
		closerToSelected := false
		candVec := h.nodes[cand.id].Vector
		for _, selID := range selected {
			distToSel := CosineDistance(candVec, h.nodes[selID].Vector)
			if distToSel < cand.dist {
				closerToSelected = true
				break
			}
		}
		if !closerToSelected {
			selected = append(selected, cand.id)
		} else {
			discarded = append(discarded, cand.id)
		}
	}

	// 若多样化筛选后邻居数不足 m，则从 discarded 中按距离从近到远补足，避免稀疏节点孤立
	for _, discID := range discarded {
		if len(selected) >= m {
			break
		}
		selected = append(selected, discID)
	}
	return selected
}

// hnswSnapshot 定义 HNSW 图索引落盘持久化的 JSON 结构。
type hnswSnapshot struct {
	Config     HNSWConfig  `json:"config"`
	EntryPoint int         `json:"entry_point"`
	MaxLayer   int         `json:"max_layer"`
	Nodes      []*HNSWNode `json:"nodes"`
}

// SaveToFile 将 HNSW 多层图索引及全部 256 维向量持久化保存到磁盘文件。
func (h *HNSWIndex) SaveToFile(filePath string) error {
	h.mu.RLock()
	defer h.mu.RUnlock()

	snap := hnswSnapshot{
		Config:     h.cfg,
		EntryPoint: h.entryPoint,
		MaxLayer:   h.maxLayer,
		Nodes:      h.nodes,
	}
	raw, err := json.MarshalIndent(snap, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filePath, raw, 0o644)
}

// LoadHNSWFromFile 从磁盘 JSON 快照文件恢复 HNSW 多层图索引。
func LoadHNSWFromFile(filePath string) (*HNSWIndex, error) {
	raw, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}
	var snap hnswSnapshot
	if err := json.Unmarshal(raw, &snap); err != nil {
		return nil, err
	}
	idx := NewHNSWIndex(snap.Config)
	idx.entryPoint = snap.EntryPoint
	idx.maxLayer = snap.MaxLayer
	idx.nodes = snap.Nodes
	for _, n := range idx.nodes {
		idx.docIDToIdx[n.DocID] = n.InternalID
	}
	return idx, nil
}

// distItem 是优先队列中的内部节点距离条目。
type distItem struct {
	id   int
	dist float64
}

// minDistHeap 实现按距离从小到大弹出的最小堆。
type minDistHeap []distItem

func (h minDistHeap) Len() int { return len(h) }
func (h minDistHeap) Less(i, j int) bool {
	if math.Abs(h[i].dist-h[j].dist) < 1e-12 {
		return h[i].id < h[j].id
	}
	return h[i].dist < h[j].dist
}
func (h minDistHeap) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *minDistHeap) Push(x interface{}) { *h = append(*h, x.(distItem)) }
func (h *minDistHeap) Pop() interface{} {
	old := *h
	n := len(old)
	item := old[n-1]
	*h = old[:n-1]
	return item
}

// maxDistHeap 实现按距离从大到小弹出的最大堆（用于维护容量为 ef 的最近邻窗口）。
type maxDistHeap []distItem

func (h maxDistHeap) Len() int { return len(h) }
func (h maxDistHeap) Less(i, j int) bool {
	if math.Abs(h[i].dist-h[j].dist) < 1e-12 {
		return h[i].id > h[j].id
	}
	return h[i].dist > h[j].dist
}
func (h maxDistHeap) Swap(i, j int)       { h[i], h[j] = h[j], h[i] }
func (h *maxDistHeap) Push(x interface{}) { *h = append(*h, x.(distItem)) }
func (h *maxDistHeap) Pop() interface{} {
	old := *h
	n := len(old)
	item := old[n-1]
	*h = old[:n-1]
	return item
}

func containsInt(slice []int, target int) bool {
	for _, v := range slice {
		if v == target {
			return true
		}
	}
	return false
}
