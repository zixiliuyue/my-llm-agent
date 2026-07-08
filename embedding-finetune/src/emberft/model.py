"""可学习嵌入模型：把稀疏词频特征投影到低维稠密嵌入。

学习目标：用最小可读的代码复刻"嵌入模型 = 编码器 + 可训练参数"的本质。
真实模型是多层 Transformer，这里退化成一层线性投影 W：

    embedding = normalize(W · features)

其中 features 来自 features.featurize（固定维度稀疏词频），
W 是 [embed_dim × feature_dim] 的可训练矩阵。对比学习就是调 W，
使同领域的 query 和正确 passage 在嵌入空间里更近。

为什么这个退化模型仍有教学价值：
- 它有真实可训练参数和真实梯度，能观测 loss 下降和检索指标提升。
- 初始 W 用确定性伪随机投影（近似保距），未训练时就是一个合理 baseline，
  微调后指标应显著优于 baseline —— 这正是方案要证明的核心结论。
- 前缀 instruction（query:/passage:）在特征前拼接，复刻非对称检索处理。
"""

from __future__ import annotations

import hashlib
import json
import math
from typing import List, Sequence

from .features import FEATURE_DIM, featurize
from .linalg import Vector, normalize

# 默认嵌入维度：远小于 FEATURE_DIM，起到降维/压缩语义的作用。
DEFAULT_EMBED_DIM = 64


def _seeded_gaussian(seed_text: str) -> float:
    """用文本种子生成一个确定性的近似标准正态采样。

    为什么不用 random 模块：需要跨进程、跨机器完全可复现（否则 baseline 不可比）。
    做法：对种子做 md5，取 8 字节映射到 (0,1) 均匀数，用 Box-Muller 变换成正态。
    """
    d1 = hashlib.md5((seed_text + "#u1").encode("utf-8")).digest()
    d2 = hashlib.md5((seed_text + "#u2").encode("utf-8")).digest()
    # 映射到 (0,1)，避免取到 0 导致 log 溢出
    u1 = (int.from_bytes(d1[:8], "big") + 1) / (2**64 + 1)
    u2 = (int.from_bytes(d2[:8], "big") + 1) / (2**64 + 1)
    # Box-Muller
    return math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)


class EmbeddingModel:
    """线性投影嵌入模型，参数为矩阵 W（按行存储：embed_dim 行，每行 FEATURE_DIM 列）。"""

    def __init__(self, embed_dim: int = DEFAULT_EMBED_DIM, feature_dim: int = FEATURE_DIM,
                 weight: List[Vector] | None = None):
        self.embed_dim = embed_dim
        self.feature_dim = feature_dim
        if weight is not None:
            self.W = weight
        else:
            # 确定性初始化：每个 W[i][j] 由 (i,j) 种子生成，按 1/sqrt(feature_dim) 缩放，
            # 使初始投影近似保距（随机投影/JL 引理思想），成为可用的 baseline。
            scale = 1.0 / math.sqrt(feature_dim)
            self.W = [
                [_seeded_gaussian(f"init:{i}:{j}") * scale for j in range(feature_dim)]
                for i in range(embed_dim)
            ]

    # ---- 前向：文本 -> 嵌入 ----

    def _project(self, feats: Sequence[float]) -> Vector:
        """线性投影 W·feats，返回未归一化的 embed_dim 向量。"""
        return [sum(self.W[i][j] * feats[j] for j in range(self.feature_dim))
                for i in range(self.embed_dim)]

    def encode_features(self, feats: Sequence[float]) -> Vector:
        """特征 -> 归一化嵌入。训练循环里复用，避免重复特征化。"""
        return normalize(self._project(feats))

    def encode(self, text: str, kind: str = "query") -> Vector:
        """文本 -> 归一化嵌入。

        kind 决定 instruction 前缀（query/passage），复刻非对称检索：
        同一句话作为查询和作为文档，特征略有差异，模型可分别适配。
        """
        prefix = "query: " if kind == "query" else "passage: "
        feats = featurize(prefix + text)
        return self.encode_features(feats)

    # ---- 持久化：保存/加载权重（JSON，纯文本可 diff） ----

    def save(self, path: str) -> None:
        with open(path, "w", encoding="utf-8") as f:
            json.dump({
                "embed_dim": self.embed_dim,
                "feature_dim": self.feature_dim,
                "weight": self.W,
            }, f)

    @classmethod
    def load(cls, path: str) -> "EmbeddingModel":
        with open(path, "r", encoding="utf-8") as f:
            obj = json.load(f)
        return cls(embed_dim=obj["embed_dim"], feature_dim=obj["feature_dim"],
                   weight=obj["weight"])
