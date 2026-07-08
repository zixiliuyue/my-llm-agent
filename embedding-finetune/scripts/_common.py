"""脚本共享工具：数据加载、路径、环境变量解析。

学习目标：把 JSONL 读取、data 目录定位、EMB_* 环境变量解析集中一处，
让各脚本（baseline/train/evaluate/export/pipeline）保持简短、聚焦主干。
"""

from __future__ import annotations

import json
import os
import sys
from typing import Dict, List, Sequence, Set, Tuple

# 让脚本无需安装即可 import src/emberft：把 src 加入 sys.path。
_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)
_SRC = os.path.join(_ROOT, "src")
if _SRC not in sys.path:
    sys.path.insert(0, _SRC)

DATA_DIR = os.path.join(_ROOT, "data")
ARTIFACT_DIR = os.path.join(_ROOT, "artifacts")


def read_jsonl(path: str) -> List[dict]:
    """读取 JSONL 文件为 dict 列表，跳过空行。"""
    rows: List[dict] = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def load_train_pairs() -> List[dict]:
    """加载训练对（query/positive/hard_negatives）。"""
    return read_jsonl(os.path.join(DATA_DIR, "train_pairs.jsonl"))


def load_eval() -> Tuple[List[Tuple[str, str]], Dict[str, str], Dict[str, Set[str]]]:
    """加载评测集，返回 (corpus[(id,text)], queries{qid:query}, qrels{qid:set(doc_id)})。"""
    corpus_rows = read_jsonl(os.path.join(DATA_DIR, "eval_corpus.jsonl"))
    qrel_rows = read_jsonl(os.path.join(DATA_DIR, "eval_qrels.jsonl"))
    corpus = [(r["id"], r["text"]) for r in corpus_rows]
    queries = {r["qid"]: r["query"] for r in qrel_rows}
    qrels = {r["qid"]: set(r["relevant"]) for r in qrel_rows}
    return corpus, queries, qrels


def env_config():
    """解析 EMB_* 环境变量为 TrainConfig，实现 CPU 冒烟 / GPU 实训双兼容。

    对应方案：CPU 冒烟用小 batch/少 epoch 验证链路；GPU 实训放大 batch/epoch。
    这里线性模型本身在 CPU 上就能全量跑，环境变量主要用于演示同一份代码可调参。
    """
    from emberft.contrastive import TrainConfig
    return TrainConfig(
        epochs=int(os.getenv("EMB_EPOCHS", "8")),
        batch_size=int(os.getenv("EMB_BATCH", "8")),
        lr=float(os.getenv("EMB_LR", "0.5")),
        temperature=float(os.getenv("EMB_TEMP", "0.05")),
        seed=int(os.getenv("EMB_SEED", "20260708")),
    )


def to_train_samples(rows: List[dict]):
    """把 JSONL 行转成 TrainSample 列表。"""
    from emberft.contrastive import TrainSample
    return [TrainSample(query=r["query"], positive=r["positive"],
                        hard_negatives=r.get("hard_negatives", [])) for r in rows]


def fmt_metrics(m: Dict[str, float]) -> str:
    """把指标 dict 格式化成一行可读字符串。"""
    keys = sorted(m.keys(), key=lambda k: (k.split("@")[0], int(k.split("@")[1])))
    return "  ".join(f"{k}={m[k]:.4f}" for k in keys)
