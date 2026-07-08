#!/usr/bin/env python3
"""评估脚本：在评测集上对比 baseline 与已保存微调模型的检索指标。

对应方案阶段一(baseline) + 阶段三评估。
运行：先 python3 scripts/train.py 生成 artifacts/finetuned.json，再：
    python3 scripts/evaluate.py
若无微调模型，仅打印 baseline。
"""

from __future__ import annotations

import os
import sys

import _common as C

from emberft.model import EmbeddingModel
from emberft.retriever import Retriever
from emberft.metrics import aggregate


def _eval(model, corpus, queries, qrels):
    rank = Retriever(model, corpus).rank_all(queries, k=10)
    return aggregate(rank, qrels)


def main() -> int:
    corpus, queries, qrels = C.load_eval()

    base = EmbeddingModel()
    base_m = _eval(base, corpus, queries, qrels)
    print(f"[eval] baseline : {C.fmt_metrics(base_m)}", flush=True)

    ft_path = os.path.join(C.ARTIFACT_DIR, "finetuned.json")
    if os.path.exists(ft_path):
        ft = EmbeddingModel.load(ft_path)
        ft_m = _eval(ft, corpus, queries, qrels)
        print(f"[eval] finetuned: {C.fmt_metrics(ft_m)}", flush=True)
        print("[eval] 关键提升:", flush=True)
        for k in ("recall@10", "mrr@10", "ndcg@10"):
            print(f"        {k}: {base_m[k]:.4f} -> {ft_m[k]:.4f} ({ft_m[k]-base_m[k]:+.4f})", flush=True)
    else:
        print(f"[eval] 未找到微调模型 {ft_path}，先运行 scripts/train.py", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
