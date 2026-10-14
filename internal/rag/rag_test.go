package rag

import (
	"context"
	"math"
	"path/filepath"
	"testing"
)

// TestSubwordProjectionEmbedder_L2AndSemanticSimilarity 验证 256 维稠密向量的 L2 单位归一化性质，
// 以及跨同义词表述下的余弦相似度显著高于无关故障域。
func TestSubwordProjectionEmbedder_L2AndSemanticSimilarity(t *testing.T) {
	ctx := context.Background()
	corpus := DefaultSREKnowledgeCorpus()
	texts := make([]string, len(corpus))
	for i, d := range corpus {
		texts[i] = d.FullText()
	}

	emb := NewSubwordProjectionEmbedder(DefaultEmbeddingDim, 0)
	emb.FitCorpus(texts)

	qGorm1, err := emb.Embed(ctx, "GORM 链式 Where 调用未接收返回值导致多租户配置跨项目误刷串台")
	if err != nil {
		t.Fatalf("Embed qGorm1 失败: %v", err)
	}
	if len(qGorm1) != DefaultEmbeddingDim {
		t.Fatalf("期望向量维度 %d, 实际 %d", DefaultEmbeddingDim, len(qGorm1))
	}

	// 验证 L2 范数严格为 1.0
	var normSq float64
	for _, v := range qGorm1 {
		normSq += v * v
	}
	if math.Abs(normSq-1.0) > 1e-6 {
		t.Fatalf("向量未完成 L2 单位归一化: ||v||^2 = %f", normSq)
	}

	qGorm2, _ := emb.Embed(ctx, "db.Where tenant_id 过滤条件丢失引发全表更新多租户污染")
	qWebGL, _ := emb.Embed(ctx, "浏览器监控大盘 setInterval 重复绑定与 WebGL 后台 60fps 空转 OOM")

	simSameDomain := CosineSimilarity(qGorm1, qGorm2)
	simCrossDomain := CosineSimilarity(qGorm1, qWebGL)

	if simSameDomain <= simCrossDomain {
		t.Fatalf("同故障域语义余弦相似度 (%f) 应当显著高于跨故障域相似度 (%f)", simSameDomain, simCrossDomain)
	}
	if simSameDomain < 0.35 {
		t.Fatalf("同故障域语义余弦相似度过低: %f", simSameDomain)
	}
}

// TestHNSWIndex_RecallAndPersistence 验证 HNSW 多层图索引相对于精确线性扫描的 Recall@K 召回率，
// 并验证 SaveToFile / LoadHNSWFromFile 快照序列化的一致性。
func TestHNSWIndex_RecallAndPersistence(t *testing.T) {
	ctx := context.Background()
	corpus := DefaultSREKnowledgeCorpus()
	texts := make([]string, len(corpus))
	for i, d := range corpus {
		texts[i] = d.FullText()
	}

	emb := NewSubwordProjectionEmbedder(DefaultEmbeddingDim, 0)
	emb.FitCorpus(texts)

	hnsw := NewHNSWIndex(DefaultHNSWConfig())
	for _, doc := range corpus {
		vec, err := emb.Embed(ctx, doc.FullText())
		if err != nil {
			t.Fatalf("编码文档 %s 失败: %v", doc.ID, err)
		}
		if err := hnsw.Add(doc.ID, vec, map[string]string{"category": doc.Category}); err != nil {
			t.Fatalf("HNSW 插入文档 %s 失败: %v", doc.ID, err)
		}
	}

	if hnsw.Size() != len(corpus) {
		t.Fatalf("HNSW 节点数不匹配: 期望 %d, 实际 %d", len(corpus), hnsw.Size())
	}

	queries := []string{
		"ClickHouse 连接池耗尽 acquire connection timeout 未执行 tx.Rollback",
		"Redis Stream XREADGROUP 毒丸消息触发空切片 index out of range panic",
		"跨国骨干网 BGP 路由震荡丢包导致 CDN HTTP 200 成功率暴跌",
		"宿主机 /tmp 大日志触发边缘 Agent 1024MB 熔断与 IPC 截断",
		"NSQ 消费者提前 Finish ACK 在容器 OOMKilled 137 时丢失发布任务",
	}

	totalHits := 0
	matchedExactTop1 := 0
	for _, q := range queries {
		qVec, _ := emb.Embed(ctx, q)
		approx := hnsw.Search(qVec, 3, 48)
		exact := hnsw.BruteForceSearch(qVec, 3)
		if len(approx) == 0 || len(exact) == 0 {
			t.Fatalf("查询返回为空: %s", q)
		}
		if approx[0].DocID == exact[0].DocID {
			matchedExactTop1++
		}
		totalHits++
	}

	recallTop1 := float64(matchedExactTop1) / float64(totalHits)
	if recallTop1 < 0.95 {
		t.Fatalf("HNSW Top-1 相对精确搜索的召回率过低: %.2f", recallTop1)
	}

	// 测试持久化落盘与重新加载
	tmpFile := filepath.Join(t.TempDir(), "hnsw_index.json")
	if err := hnsw.SaveToFile(tmpFile); err != nil {
		t.Fatalf("保存 HNSW 快照失败: %v", err)
	}
	loaded, err := LoadHNSWFromFile(tmpFile)
	if err != nil {
		t.Fatalf("加载 HNSW 快照失败: %v", err)
	}
	qVec, _ := emb.Embed(ctx, queries[0])
	resBefore := hnsw.Search(qVec, 3, 48)
	resAfter := loaded.Search(qVec, 3, 48)
	if len(resBefore) != len(resAfter) || resBefore[0].DocID != resAfter[0].DocID {
		t.Fatalf("HNSW 持久化前后检索结果不一致: before=%v, after=%v", resBefore, resAfter)
	}
}

// TestHybridRetriever_AllTenCategories 验证 HNSW + BM25 + RRF 混合检索在 10 大故障类别上的 Top-1 召回准确性。
func TestHybridRetriever_AllTenCategories(t *testing.T) {
	ctx := context.Background()
	corpus := DefaultSREKnowledgeCorpus()
	retriever := NewHybridRetriever(nil, DefaultHybridRetrieverConfig())
	if err := retriever.IndexDocuments(ctx, corpus); err != nil {
		t.Fatalf("构建混合检索索引失败: %v", err)
	}

	testCases := []struct {
		query            string
		expectedCategory string
	}{
		{"GORM db.Where 链式调用丢弃返回值，多租户配置被跨项目全表更新", "db_orm_tenant_leak"},
		{"ClickHouse 高并发小事务未 Rollback 导致 max_open_conns 连接池耗尽", "olap_conn_pool_exhaustion"},
		{"Redis Stream 毒丸消息导致空切片越界 panic 被 recover 吞没且 PEL 堆积", "mq_poison_pill_dlq"},
		{"多个项目共用云 NAT 出口 EIP 导致外部告警归属项目错乱", "nat_ip_alert_disambiguation"},
		{"跨国骨干网 BGP 专线丢包抖动引起边缘 CDN 200 成功率暴跌", "backbone_bgp_packet_loss"},
		{"宿主机 /tmp 被大日志写满低于 1024MB 触发 Agent 1GB 熔断与 IPC 截断", "edge_agent_disk_full_circuit_break"},
		{"Bulldog 堡垒机与网关时间戳过期未拦截及 NTP 时钟漂移重放异常", "auth_replay_and_clock_skew"},
		{"NSQ Worker 提前调用 Finish ACK 在容器 OOMKilled 时静默丢失发布任务", "nsq_early_ack_task_loss"},
		{"多进程 gre_cli 并发刷新 OAuth2 Token 覆写 config.yaml 导致 401", "oauth_token_race_overwrite"},
		{"监控大盘 setInterval 定时器重复绑定与 WebGL 后台 60fps 空转 OOM", "frontend_memory_leak_oom"},
	}

	for _, tc := range testCases {
		hits, err := retriever.Retrieve(ctx, tc.query, 3, ModeHybridRRF)
		if err != nil {
			t.Fatalf("Retrieve(%s) 错误: %v", tc.query, err)
		}
		if len(hits) == 0 {
			t.Fatalf("Retrieve(%s) 未返回结果", tc.query)
		}
		if hits[0].Document.Category != tc.expectedCategory {
			t.Errorf("Query=%q Top-1 命中类别错误: 期望 %s, 实际 %s (DocID=%s)",
				tc.query, tc.expectedCategory, hits[0].Document.Category, hits[0].Document.ID)
		}
	}
}
