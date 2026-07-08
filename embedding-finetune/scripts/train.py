#!/usr/bin/env python3
"""训练脚本：单独运行对比学习微调并保存模型。

对应方案阶段三。默认参数即可跑通；用 EMB_* 环境变量切换 CPU 冒烟/放大规模：
    EMB_EPOCHS=3 EMB_BATCH=4 python3 scripts/train.py     # 冒烟
    python3 scripts/train.py                               # 默认
产物：artifacts/finetuned.json（微调后权重）。
"""

from __future__ import annotations

import os
import sys

import _common as C

from emberft.model import EmbeddingModel
from emberft.contrastive import train
from emberft.retriever import Retriever
from emberft.metrics import aggregate


def main() -> int:
    rows = C.load_train_pairs()
    corpus, queries, qrels = C.load_eval()
    cfg = C.env_config()
    print(f"[train] 样本={len(rows)} epochs={cfg.epochs} batch={cfg.batch_size} "
          f"lr={cfg.lr} temperature={cfg.temperature}", flush=True)

    model = EmbeddingModel()
    samples = C.to_train_samples(rows)

    def on_epoch(epoch, loss, m):
        rank = Retriever(m, corpus).rank_all(queries, k=10)
        met = aggregate(rank, qrels)
        print(f"[train] epoch {epoch:>2} loss={loss:.4f} "
              f"ndcg@10={met['ndcg@10']:.4f} recall@10={met['recall@10']:.4f}", flush=True)

    train(model, samples, cfg, on_epoch=on_epoch)

    os.makedirs(C.ARTIFACT_DIR, exist_ok=True)
    out = os.path.join(C.ARTIFACT_DIR, "finetuned.json")
    model.save(out)
    print(f"[train] 已保存微调模型: {out}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
