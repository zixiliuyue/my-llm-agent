"""向量运算工具（纯标准库，无 numpy 依赖）。

学习目标：把嵌入/对比学习需要的稠密向量运算收敛到一个模块，
避免各处重复实现点积、范数、归一化时出现不一致或数值 bug。

为什么不用 numpy：本仓库默认路径要在只装了标准库的 CI/CPU 环境跑通，
真正的 GPU 训练走 sentence-transformers（见 scripts/real_finetune.py）。
这里用 list[float] 表示向量，够教学演示，也让每一步梯度都看得见。
"""

from __future__ import annotations

import math
from typing import List, Sequence

# 向量类型别名：统一用 list[float]，方便 JSON 序列化保存模型
Vector = List[float]


def zeros(dim: int) -> Vector:
    """返回全 0 向量，用于梯度累加器初始化。"""
    return [0.0] * dim


def dot(a: Sequence[float], b: Sequence[float]) -> float:
    """向量点积。对比学习里 query 与 passage 的相似度就是归一化后向量的点积。"""
    if len(a) != len(b):
        raise ValueError(f"点积维度不一致: {len(a)} vs {len(b)}")
    return math.fsum(x * y for x, y in zip(a, b))


def norm(a: Sequence[float]) -> float:
    """L2 范数。归一化和梯度反传都要用到。"""
    return math.sqrt(math.fsum(x * x for x in a))


def add_scaled(acc: Vector, vec: Sequence[float], scale: float) -> None:
    """就地把 scale*vec 累加到 acc 上。

    训练时梯度按特征累加，这里就地更新可以避免频繁分配大列表，
    在纯 Python 下对速度和内存都更友好。
    """
    for i, v in enumerate(vec):
        acc[i] += scale * v


def normalize(a: Sequence[float]) -> Vector:
    """L2 归一化，使向量落在单位球面上。

    检索里比较的是方向（余弦相似度），归一化后点积即余弦相似度。
    对零向量做兜底：返回原始零向量，避免除零。
    """
    n = norm(a)
    if n == 0.0:
        return list(a)
    return [x / n for x in a]


def cosine(a: Sequence[float], b: Sequence[float]) -> float:
    """余弦相似度，导出数值一致性校验（>0.999）会直接用它。"""
    na, nb = norm(a), norm(b)
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot(a, b) / (na * nb)


def softmax(logits: Sequence[float]) -> Vector:
    """数值稳定 softmax：先减最大值再指数，防止溢出。

    InfoNCE 的交叉熵需要把一行相似度打成概率分布，这里是关键一步。
    """
    m = max(logits)
    exps = [math.exp(x - m) for x in logits]
    s = math.fsum(exps)
    return [e / s for e in exps]
