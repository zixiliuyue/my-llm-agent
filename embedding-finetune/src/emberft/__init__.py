"""emberft：从 0 到 1 微调嵌入模型的最小可运行实现（纯标准库）。

对应 docs/embedding-finetune-for-rag.md 方案的默认可跑路径：
- features   文本 -> 稀疏词频特征（字级+bigram+特征哈希）
- model      可学习线性投影嵌入 + instruction 前缀（非对称检索）
- contrastive InfoNCE + 批内负例 + 难负例，手写梯度训练循环
- dataset    清洗/去重/去泄漏/平衡/难负例挖掘
- metrics    Recall@K / MRR@K / nDCG@K
- retriever  最近邻检索
- export_check 导出 fp32/INT8 量化 + 数值一致性校验(余弦>0.999)

真实 GPU 训练与 ONNX 导出见 scripts/real_finetune.py（需显式装 sentence-transformers）。
"""

from .model import EmbeddingModel  # noqa: F401
from .contrastive import TrainSample, TrainConfig, train  # noqa: F401
from .retriever import Retriever  # noqa: F401

__all__ = ["EmbeddingModel", "TrainSample", "TrainConfig", "train", "Retriever"]
