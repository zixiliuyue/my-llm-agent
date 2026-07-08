#!/usr/bin/env python3
"""端到端流水线：baseline -> 数据工程 -> 对比学习微调 -> 评估 -> 导出验证。

学习目标：一条命令跑通方案第 7 节技术路线图的四个阶段，用真实指标证明
"微调后检索指标显著优于 baseline"，并完成导出数值一致性与量化验证。

运行（项目根目录 embedding-finetune/ 下）：
    python3 scripts/pipeline.py
CPU 冒烟微调（更小更快）：
    EMB_EPOCHS=3 EMB_BATCH=4 python3 scripts/pipeline.py

输出：各阶段日志 + 最终 baseline/finetuned 指标对比 + 导出报告；
成功判据：finetuned 的 nDCG@10 显著高于 baseline，导出 fp32 余弦=1、INT8 余弦>阈值。
"""

from __future__ import annotations

import os
import sys

import _common as C  # 脚本共享工具，内部已把 src 加入 sys.path

from emberft.model import EmbeddingModel
from emberft.contrastive import train
from emberft.retriever import Retriever
from emberft.metrics import aggregate
from emberft.dataset import (
    RawSample, clean_text, length_filter, dedup_samples,
    detect_leakage, balance_negatives, mine_hard_negatives,
)
from emberft.export_check import export_fp32, quantize_int8, consistency_report


def log(msg: str) -> None:
    """统一带阶段标记的日志，符合"周期/长流程要有足够日志"的要求。"""
    print(msg, flush=True)


def stage_data_engineering(rows):
    """阶段二：清洗 -> 去重 -> 泄漏检测 -> 难负例补充 -> 平衡。返回 RawSample 列表。"""
    log("── 阶段二 数据工程 ──")
    # 清洗 + 长度过滤
    raw = []
    for r in rows:
        q = clean_text(r["query"])
        p = clean_text(r["positive"])
        if not (length_filter(q, min_len=2) and length_filter(p)):
            continue
        negs = [clean_text(h) for h in r.get("hard_negatives", []) if length_filter(clean_text(h))]
        raw.append(RawSample(q, p, negs))
    log(f"  清洗+长度过滤后样本数: {len(raw)}")

    # 近重去重
    deduped, dropped = dedup_samples(raw, threshold=0.8)
    log(f"  近重去重: 丢弃 {len(dropped)} 条, 保留 {len(deduped)} 条")

    # 泄漏检测：训练正例 vs 评测语料（本教学集刻意让 eval_corpus 含训练正例文本，
    # 以演示检测能力；检测到的重叠说明"评测语料含训练正例"，真实项目须据此切分）
    corpus, _, _ = C.load_eval()
    eval_texts = [t for _, t in corpus]
    leaks = detect_leakage([s.positive for s in deduped], eval_texts, threshold=0.8)
    log(f"  泄漏检测: 发现 {len(leaks)} 处训练正例与评测语料近重（须在真实切分中剔除）")

    # 平衡难负例数量
    balanced = balance_negatives(deduped)
    tgt = max((len(s.hard_negatives) for s in balanced), default=0)
    log(f"  难负例平衡: 每条对齐到 {tgt} 个")
    return balanced


def demo_hard_negative_mining(base_model, samples):
    """演示用基座挖掘难负例：对第一条样本，从其它样本正例池里挖高相似非正确段落。"""
    log("── 难负例挖掘演示（用未微调基座检索）──")
    corpus = [(f"c{i}", s.positive) for i, s in enumerate(samples[1:], start=1)]
    mined = mine_hard_negatives(
        samples[0].query, samples[0].positive, corpus,
        encode=lambda t, k: base_model.encode(t, k), top_n=2,
    )
    log(f"  query: {samples[0].query}")
    for i, m in enumerate(mined, 1):
        log(f"  挖到难负例{i}: {m[:40]}...")


def main() -> int:
    log("========== 嵌入微调端到端流水线 ==========")
    rows = C.load_train_pairs()
    corpus, queries, qrels = C.load_eval()
    log(f"训练对: {len(rows)}  评测语料: {len(corpus)}  评测查询: {len(queries)}")

    # 阶段一：baseline —— 未微调基座在评测集上的检索指标
    log("── 阶段一 基线 baseline ──")
    base_model = EmbeddingModel()
    base_rank = Retriever(base_model, corpus).rank_all(queries, k=10)
    base_metrics = aggregate(base_rank, qrels)
    log(f"  baseline: {C.fmt_metrics(base_metrics)}")

    # 阶段二：数据工程
    samples = stage_data_engineering(rows)
    demo_hard_negative_mining(base_model, samples)

    # 阶段三：对比学习微调 + 训练监控（每 epoch 打印 loss 和 eval nDCG，早停判定依据）
    log("── 阶段三 对比学习微调 ──")
    cfg = C.env_config()
    log(f"  超参: epochs={cfg.epochs} batch={cfg.batch_size} lr={cfg.lr} temperature={cfg.temperature}")
    ft_model = EmbeddingModel()  # 与 baseline 同确定性初始化，公平对比
    from emberft.contrastive import TrainSample
    train_samples = [TrainSample(s.query, s.positive, s.hard_negatives) for s in samples]

    best = {"ndcg": -1.0, "epoch": -1}

    def on_epoch(epoch, loss, model):
        rank = Retriever(model, corpus).rank_all(queries, k=10)
        m = aggregate(rank, qrels)
        nd = m["ndcg@10"]
        flag = ""
        if nd > best["ndcg"]:
            best["ndcg"] = nd
            best["epoch"] = epoch
            flag = " *best"
        log(f"  epoch {epoch:>2}: loss={loss:.4f}  ndcg@10={nd:.4f}  recall@10={m['recall@10']:.4f}{flag}")

    train(ft_model, train_samples, cfg, on_epoch=on_epoch)
    log(f"  收敛判定: 最优 nDCG@10={best['ndcg']:.4f} 出现在 epoch {best['epoch']}（平台期即可早停）")

    # 阶段三评估：finetuned vs baseline
    ft_rank = Retriever(ft_model, corpus).rank_all(queries, k=10)
    ft_metrics = aggregate(ft_rank, qrels)
    log("── 微调 vs baseline 指标对比 ──")
    for k in ("recall@10", "mrr@10", "ndcg@10", "recall@5", "mrr@5", "ndcg@5"):
        delta = ft_metrics[k] - base_metrics[k]
        log(f"  {k:<10}: baseline={base_metrics[k]:.4f} -> finetuned={ft_metrics[k]:.4f}  ({delta:+.4f})")

    improved = ft_metrics["ndcg@10"] > base_metrics["ndcg@10"]
    log(f"  结论: 微调后 nDCG@10 {'提升 ✓' if improved else '未提升 ✗'}")

    # 阶段四：导出与验证
    log("── 阶段四 导出与数值一致性验证 ──")
    probes = [t for _, t in corpus[:8]]
    fp32 = export_fp32(ft_model)
    rep_fp32 = consistency_report(ft_model, fp32, probes, threshold=0.999)
    log(f"  fp32 导出: {rep_fp32.summary()}")

    int8, scales = quantize_int8(ft_model)
    rep_int8 = consistency_report(ft_model, int8, probes, threshold=0.95)
    log(f"  INT8 量化: {rep_int8.summary()}")
    # 量化后检索指标是否回退
    int8_rank = Retriever(int8, corpus).rank_all(queries, k=10)
    int8_metrics = aggregate(int8_rank, qrels)
    ndcg_drop = ft_metrics["ndcg@10"] - int8_metrics["ndcg@10"]
    log(f"  INT8 检索回归: ndcg@10 {ft_metrics['ndcg@10']:.4f} -> {int8_metrics['ndcg@10']:.4f} (回退 {ndcg_drop:+.4f})")

    # 保存产物（artifacts/ 不进版本库，见 .gitignore 规划）
    os.makedirs(C.ARTIFACT_DIR, exist_ok=True)
    ft_model.save(os.path.join(C.ARTIFACT_DIR, "finetuned.json"))
    base_model.save(os.path.join(C.ARTIFACT_DIR, "baseline.json"))
    log(f"  已保存模型到 {C.ARTIFACT_DIR}/")

    # 成功判据汇总
    ok = improved and rep_fp32.passed and rep_int8.passed
    log("========== 流水线完成 ==========")
    log(f"总判定: {'PASS ✓' if ok else 'FAIL ✗'}"
        f"（微调提升={improved} fp32一致={rep_fp32.passed} INT8一致={rep_int8.passed}）")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
