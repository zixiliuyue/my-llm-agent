"""检索评估指标：Recall@K、MRR@K、nDCG@K（纯标准库）。

学习目标：把方案里"唯一真相尺子"落成代码。指标不是黑盒分数，
每个都要能解释：召回覆盖率、第一名正确的倒数排名、带位置折扣的增益。

约定：
- ranking 是按相似度降序排列的文档 id 列表。
- relevant 是该 query 的正确文档 id 集合（二值相关，rel=1）。
"""

from __future__ import annotations

import math
from typing import Dict, List, Sequence, Set


def recall_at_k(ranking: Sequence[str], relevant: Set[str], k: int) -> float:
    """Recall@K：前 K 个结果里命中的相关文档占全部相关文档的比例。

    检索侧最关键指标：正确文档没进 Top-K，后面生成再好也答非所问。
    """
    if not relevant:
        return 0.0
    topk = set(ranking[:k])
    hit = len(topk & relevant)
    return hit / len(relevant)


def mrr_at_k(ranking: Sequence[str], relevant: Set[str], k: int) -> float:
    """MRR@K：第一个相关文档排名的倒数（1/rank），前 K 无命中记 0。

    反映"正确答案排得多靠前"，对只取 Top-1/Top-3 的场景尤其重要。
    """
    for i, doc in enumerate(ranking[:k]):
        if doc in relevant:
            return 1.0 / (i + 1)
    return 0.0


def ndcg_at_k(ranking: Sequence[str], relevant: Set[str], k: int) -> float:
    """nDCG@K：带位置折扣的增益，除以理想排序的增益做归一化。

    DCG = Σ rel_i / log2(i+2)；二值相关下理想排序是把所有相关文档排最前。
    综合了"命中"和"排在前面"，是检索质量的常用总指标。
    """
    dcg = 0.0
    for i, doc in enumerate(ranking[:k]):
        if doc in relevant:
            dcg += 1.0 / math.log2(i + 2)
    # 理想 DCG：min(相关数, k) 个文档依次排在最前
    ideal_hits = min(len(relevant), k)
    idcg = sum(1.0 / math.log2(i + 2) for i in range(ideal_hits))
    if idcg == 0.0:
        return 0.0
    return dcg / idcg


def aggregate(rankings: Dict[str, List[str]], qrels: Dict[str, Set[str]],
              ks: Sequence[int] = (1, 5, 10)) -> Dict[str, float]:
    """对全部 query 求各指标的宏平均，返回如 {"recall@10":0.9,...}。

    宏平均（每个 query 等权）符合"每条问题都要答对"的业务诉求。
    """
    out: Dict[str, float] = {}
    qids = [q for q in qrels if q in rankings]
    if not qids:
        return {f"{m}@{k}": 0.0 for k in ks for m in ("recall", "mrr", "ndcg")}
    for k in ks:
        r = sum(recall_at_k(rankings[q], qrels[q], k) for q in qids) / len(qids)
        mr = sum(mrr_at_k(rankings[q], qrels[q], k) for q in qids) / len(qids)
        nd = sum(ndcg_at_k(rankings[q], qrels[q], k) for q in qids) / len(qids)
        out[f"recall@{k}"] = r
        out[f"mrr@{k}"] = mr
        out[f"ndcg@{k}"] = nd
    return out
