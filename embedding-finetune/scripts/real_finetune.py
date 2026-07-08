#!/usr/bin/env python3
"""真实微调线（GPU 实训用，需显式安装依赖，默认不参与测试）。

这是方案第 4/5 节的真实落地代码：用 sentence-transformers 做对比学习微调，
再用 optimum 导出 ONNX。它**故意不在默认路径执行**——本仓库遵循 local-only 边界，
拉大模型和 GPU 训练必须手动触发。纯 stdlib 的可跑演示见 scripts/pipeline.py。

前置（手动执行，勿进 CI）：
    pip install "sentence-transformers>=2.7" datasets accelerate "optimum[onnxruntime]"

双环境（同一份代码，用环境变量切换，对应方案"双环境策略"）：
    # CPU / CI 冒烟：小基座、少样本、单 epoch、关 fp16
    EMB_BASE=paraphrase-multilingual-MiniLM-L12-v2 EMB_BATCH=8 EMB_EPOCHS=1 EMB_FP16=0 \
        python3 scripts/real_finetune.py
    # RTX 5060Ti 16G 实训：中文 base 基座、大 batch、fp16
    EMB_BASE=BAAI/bge-base-zh-v1.5 EMB_BATCH=32 EMB_EPOCHS=3 EMB_FP16=1 \
        python3 scripts/real_finetune.py

设计要点：
- MultipleNegativesRankingLoss = 批内负例 InfoNCE，检索微调首选。
- InformationRetrievalEvaluator 训练中直接算 Recall/MRR/nDCG，作早停依据。
- 训练数据复用本仓库 data/train_pairs.jsonl（query-positive 对，可扩展三元组）。
- 训练完可选用 optimum-cli 导出 ONNX 并做 INT8 量化。
"""

from __future__ import annotations

import os
import sys

import _common as C  # 复用数据加载；同时把 src 加入 sys.path（此脚本不依赖 emberft）


def build_examples(rows):
    """把 JSONL 训练对转成 sentence-transformers 的 InputExample。

    MultipleNegativesRankingLoss 只需 (query, positive) 正对，同 batch 内其它
    positive 自动充当负例；若提供 hard_negative，可作为第三元进一步强化。
    """
    from sentence_transformers import InputExample  # 延迟导入：未装依赖时不报错
    examples = []
    for r in rows:
        texts = [f"query: {r['query']}", f"passage: {r['positive']}"]
        negs = r.get("hard_negatives", [])
        if negs:
            # 取第一个难负例作为显式负样本（MNRL 支持 (a, p, n) 三元）
            texts.append(f"passage: {negs[0]}")
        examples.append(InputExample(texts=texts))
    return examples


def main() -> int:
    try:
        from sentence_transformers import SentenceTransformer, losses
        from sentence_transformers.evaluation import InformationRetrievalEvaluator
        from torch.utils.data import DataLoader
    except ImportError as e:
        print("[real] 未安装 sentence-transformers / torch，这是预期的默认状态。", flush=True)
        print("[real] 本脚本仅供 GPU 实训手动运行；纯 stdlib 演示请跑 scripts/pipeline.py。", flush=True)
        print(f"[real] 缺少依赖: {e}", flush=True)
        return 0  # 未装依赖返回 0：这是设计内的边界，不算失败

    base = os.getenv("EMB_BASE", "BAAI/bge-base-zh-v1.5")
    batch = int(os.getenv("EMB_BATCH", "32"))
    epochs = int(os.getenv("EMB_EPOCHS", "3"))
    fp16 = os.getenv("EMB_FP16", "1") == "1"
    print(f"[real] 基座={base} batch={batch} epochs={epochs} fp16={fp16}", flush=True)

    # 1) 基座（按环境变量切换，CPU/GPU 双兼容）
    model = SentenceTransformer(base)

    # 2) 训练数据（复用仓库 data/）
    rows = C.load_train_pairs()
    train_examples = build_examples(rows)
    train_loader = DataLoader(train_examples, shuffle=True, batch_size=batch)

    # 3) 损失：批内负例 InfoNCE
    train_loss = losses.MultipleNegativesRankingLoss(model)

    # 4) 评估器：训练中直接算检索指标
    corpus_rows, queries, qrels = C.load_eval()
    corpus = {doc_id: text for doc_id, text in corpus_rows}
    ir_evaluator = InformationRetrievalEvaluator(
        queries=queries,
        corpus=corpus,
        relevant_docs={qid: set(docs) for qid, docs in qrels.items()},
        name="domain-eval",
    )

    # 5) 训练循环 + 早停最优保存
    out_path = os.path.join(C.ARTIFACT_DIR, "bge-domain-ft")
    os.makedirs(C.ARTIFACT_DIR, exist_ok=True)
    model.fit(
        train_objectives=[(train_loader, train_loss)],
        evaluator=ir_evaluator,
        epochs=epochs,
        warmup_steps=int(0.1 * len(train_loader)),
        optimizer_params={"lr": 2e-5},
        use_amp=fp16,                 # GPU 开 fp16，CPU 关
        evaluation_steps=max(1, len(train_loader) // 2),
        save_best_model=True,         # eval 指标平台期即最优
        output_path=out_path,
    )
    print(f"[real] 训练完成，最优模型保存到 {out_path}", flush=True)
    print("[real] 导出 ONNX（手动）: "
          f"optimum-cli export onnx --model {out_path} {out_path}-onnx/", flush=True)
    print("[real] INT8 量化（手动）: "
          "optimum-cli onnxruntime quantize --avx512 --onnx_model <dir> -o <dir>-int8/", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
