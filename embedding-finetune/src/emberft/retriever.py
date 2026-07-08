"""检索器：给定模型和语料，对查询做最近邻排序（纯标准库）。

学习目标：把"检索 = query 向量的最近邻搜索"落成代码，供评估脚本调用。
这里用暴力全量余弦排序（教学语料小）；生产会用 HNSW/IVF 等 ANN 索引，
接口保持一致，替换的是索引实现而非上层评估逻辑。
"""

from __future__ import annotations

from typing import Dict, List, Sequence, Tuple

from .linalg import cosine
from .model import EmbeddingModel


class Retriever:
    """把语料编码成向量库，支持按查询检索 Top-K 文档 id。"""

    def __init__(self, model: EmbeddingModel, corpus: List[Tuple[str, str]]):
        """corpus: [(doc_id, text)]。构造时一次性编码，检索时只算 query。"""
        self.model = model
        self.doc_ids = [doc_id for doc_id, _ in corpus]
        # 预编码所有文档向量（passage 前缀），检索阶段复用
        self.doc_vecs = [model.encode(text, "passage") for _, text in corpus]

    def search(self, query: str, k: int = 10) -> List[str]:
        """返回按余弦相似度降序的前 k 个 doc_id。"""
        q = self.model.encode(query, "query")
        scored = [(cosine(q, self.doc_vecs[i]), self.doc_ids[i])
                  for i in range(len(self.doc_ids))]
        scored.sort(key=lambda x: x[0], reverse=True)
        return [doc_id for _, doc_id in scored[:k]]

    def rank_all(self, queries: Dict[str, str], k: int = 10) -> Dict[str, List[str]]:
        """批量检索：{qid: query} -> {qid: [doc_id,...]}，供指标聚合。"""
        return {qid: self.search(q, k) for qid, q in queries.items()}
