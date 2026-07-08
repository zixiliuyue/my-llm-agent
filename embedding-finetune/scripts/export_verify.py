#!/usr/bin/env python3
"""导出验证脚本：对微调模型做 fp32/INT8 导出并校验数值一致性与检索回归。

对应方案第 5 节部署验证流程①②：
  ① 数值一致性（导出前后余弦 >0.999）
  ② 检索指标不回退（重跑评测集）
运行：先有 artifacts/finetuned.json，再：
    python3 scripts/export_verify.py
"""

from __future__ import annotations

import os
import sys

import _common as C

from emberft.model import EmbeddingModel
from emberft.retriever import Retriever
from emberft.metrics import aggregate
from emberft.export_check import export_fp32, quantize_int8, consistency_report


def main() -> int:
    ft_path = os.path.join(C.ARTIFACT_DIR, "finetuned.json")
    if not os.path.exists(ft_path):
        print(f"[export] 未找到微调模型 {ft_path}，先运行 scripts/train.py", flush=True)
        return 1
    model = EmbeddingModel.load(ft_path)
    corpus, queries, qrels = C.load_eval()
    probes = [t for _, t in corpus[:8]]

    base_metrics = aggregate(Retriever(model, corpus).rank_all(queries, k=10), qrels)
    print(f"[export] 微调模型指标: {C.fmt_metrics(base_metrics)}", flush=True)

    # fp32 导出：应完全无损（余弦=1）
    fp32 = export_fp32(model)
    r1 = consistency_report(model, fp32, probes, threshold=0.999)
    print(f"[export] fp32: {r1.summary()}", flush=True)

    # INT8 量化：允许微小损失，校验 >0.95 且检索指标不回退
    int8, scales = quantize_int8(model)
    r2 = consistency_report(model, int8, probes, threshold=0.95)
    print(f"[export] int8: {r2.summary()}", flush=True)
    int8_metrics = aggregate(Retriever(int8, corpus).rank_all(queries, k=10), qrels)
    drop = base_metrics["ndcg@10"] - int8_metrics["ndcg@10"]
    print(f"[export] int8 检索回归: ndcg@10 {base_metrics['ndcg@10']:.4f} -> "
          f"{int8_metrics['ndcg@10']:.4f} (回退 {drop:+.4f})", flush=True)

    # 判据：fp32 无损、INT8 一致性达标、检索回退不超过 0.02
    ok = r1.passed and r2.passed and drop <= 0.02
    print(f"[export] 判定: {'PASS ✓' if ok else 'FAIL ✗（超阈值应回退 fp16/fp32）'}", flush=True)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
