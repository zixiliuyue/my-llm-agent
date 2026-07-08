"""对比学习训练循环：手写 InfoNCE + 批内负例 + 难负例，纯标准库梯度下降。

学习目标：把方案里 MultipleNegativesRankingLoss / InfoNCE 的原理落到可运行代码，
让每一步梯度都能看见，而不是调库黑盒。

数学（单个 query i）：
    u_i = normalize(W · f(query_i))                  查询嵌入
    c_k = normalize(W · f(candidate_k))              候选嵌入（正例池 + 难负例池）
    s_ik = (u_i · c_k) / τ                           温度缩放相似度
    L_i = -log softmax(s_i)[target_i]                InfoNCE 即 in-batch 交叉熵
候选池 = 本 batch 全部正例(N 个) + 全部难负例(M 个)，query i 的目标下标 = i。
这样 batch 越大，可见的批内负例越多，对比信号越强（方案里反复强调的点）。

反向传播（关键，全部手推）：
    dL_i/ds_ik = p_ik - 1{k==i}                      softmax-CE 标准结果
    对相似度: d(u·c)/du = c, d(u·c)/dc = u
    过 L2 归一化: g_z = (g_e - (e·g_e) e) / ||z||      Jacobian (I - e e^T)/||z||
    过线性层:   dL/dW += outer(g_z, f)                z = W·f
temperature τ 越小，分布越尖锐，对难负例惩罚越强。
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Sequence, Tuple

from .features import featurize
from .linalg import Vector, dot, norm, normalize, softmax, zeros
from .model import EmbeddingModel


@dataclass
class TrainSample:
    """一条训练样本：查询 + 正例段落 + 难负例段落列表。"""
    query: str
    positive: str
    hard_negatives: List[str] = field(default_factory=list)


@dataclass
class TrainConfig:
    """训练超参。默认值对应 CPU 冒烟；GPU 实训由 scripts 用环境变量放大。"""
    epochs: int = 8
    batch_size: int = 8
    lr: float = 0.5           # 线性模型 + 归一化特征，可用较大 lr 快速收敛
    temperature: float = 0.05  # InfoNCE 温度 τ，越小对难负例惩罚越强
    seed: int = 20260708      # 打乱顺序用的确定性种子，保证可复现


def _prefixed_features(text: str, kind: str) -> Vector:
    """按 query/passage 加 instruction 前缀后特征化（非对称检索处理）。"""
    prefix = "query: " if kind == "query" else "passage: "
    return featurize(prefix + text)


def _forward(model: EmbeddingModel, feats: Sequence[float]) -> Tuple[Vector, Vector, float]:
    """前向：返回 (归一化嵌入 e, 未归一化投影 z, ||z||)。

    反向需要 z 的范数来过归一化 Jacobian，所以这里一次算全。
    """
    z = model._project(feats)
    zn = norm(z)
    e = normalize(z)
    return e, z, zn


def _lcg_shuffle(n: int, seed: int) -> List[int]:
    """确定性打乱下标 [0,n)。

    用线性同余发生器（LCG）自造洗牌，避免依赖 random 的全局状态，
    保证同 seed 同机器结果一致，便于对比 baseline / 复现实验。
    """
    idx = list(range(n))
    state = seed & 0xFFFFFFFF
    for i in range(n - 1, 0, -1):
        state = (1103515245 * state + 12345) & 0x7FFFFFFF
        j = state % (i + 1)
        idx[i], idx[j] = idx[j], idx[i]
    return idx


def info_nce_loss_and_grad(
    model: EmbeddingModel,
    query_feats: List[Vector],
    pos_feats: List[Vector],
    neg_feats: List[Vector],
    temperature: float,
) -> Tuple[float, List[Vector]]:
    """计算一个 batch 的 InfoNCE 损失和对 W 的梯度（手写反向）。

    参数：
        query_feats: N 条查询特征
        pos_feats:   N 条对应正例特征（正例池）
        neg_feats:   M 条难负例特征（追加到候选池，任何 query 都不以其为正例）
    返回：
        (平均损失, 梯度矩阵 grad[embed_dim][feature_dim])
    """
    n = len(query_feats)
    tau = temperature

    # 候选池 = 正例(N) + 难负例(M)；query i 的目标下标就是 i。
    cand_feats = pos_feats + neg_feats
    m = len(cand_feats)

    # 前向：缓存查询与候选的 (e, z, ||z||)，反向要复用。
    q_e, q_z, q_zn = [], [], []
    for f in query_feats:
        e, z, zn = _forward(model, f)
        q_e.append(e); q_z.append(z); q_zn.append(zn)
    c_e, c_z, c_zn = [], [], []
    for f in cand_feats:
        e, z, zn = _forward(model, f)
        c_e.append(e); c_z.append(z); c_zn.append(zn)

    # 前向相似度 + softmax + 损失；同时累加对 e 的梯度。
    total_loss = 0.0
    grad_q_e = [zeros(model.embed_dim) for _ in range(n)]   # dL/du_i
    grad_c_e = [zeros(model.embed_dim) for _ in range(m)]   # dL/dc_k

    for i in range(n):
        logits = [dot(q_e[i], c_e[k]) / tau for k in range(m)]
        probs = softmax(logits)
        # 目标下标 i：正例在候选池前 N 个里的第 i 个。
        total_loss += -math.log(max(probs[i], 1e-12))
        for k in range(m):
            # dL_i/d(u_i·c_k) = (p_ik - y_ik)/tau
            coeff = (probs[k] - (1.0 if k == i else 0.0)) / tau
            # 累加到 e 的梯度：对 u_i 加 coeff*c_k，对 c_k 加 coeff*u_i
            add = c_e[k]
            gq = grad_q_e[i]
            for d in range(model.embed_dim):
                gq[d] += coeff * add[d]
            gc = grad_c_e[k]
            uq = q_e[i]
            for d in range(model.embed_dim):
                gc[d] += coeff * uq[d]

    # 反向过归一化 + 线性层，累加到 W 的梯度。
    grad_W = [zeros(model.feature_dim) for _ in range(model.embed_dim)]

    def _accumulate(e: Vector, zn: float, g_e: Vector, feats: Vector) -> None:
        """把某个样本的 dL/de 反传成 dL/dW 并累加。

        过归一化 Jacobian: g_z = (g_e - (e·g_e) e) / ||z||
        过线性层 z=W·f:    dL/dW[a][b] += g_z[a] * f[b]
        """
        if zn == 0.0:
            return
        edotg = dot(e, g_e)
        g_z = [(g_e[a] - edotg * e[a]) / zn for a in range(model.embed_dim)]
        for a in range(model.embed_dim):
            gza = g_z[a]
            if gza == 0.0:
                continue
            row = grad_W[a]
            for b, fb in enumerate(feats):
                if fb != 0.0:
                    row[b] += gza * fb

    for i in range(n):
        _accumulate(q_e[i], q_zn[i], grad_q_e[i], query_feats[i])
    for k in range(m):
        _accumulate(c_e[k], c_zn[k], grad_c_e[k], cand_feats[k])

    # 损失和梯度都按 batch 内 query 数取平均，使不同 batch 尺度可比。
    avg_loss = total_loss / n
    for a in range(model.embed_dim):
        for b in range(model.feature_dim):
            grad_W[a][b] /= n
    return avg_loss, grad_W


def train(model: EmbeddingModel, samples: List[TrainSample], config: TrainConfig,
          on_epoch=None) -> List[float]:
    """在 samples 上用对比学习微调 model.W（就地更新）。

    on_epoch(epoch, avg_loss, model) 可选回调：训练脚本用它在每个 epoch 末
    打印 loss 并算检索指标，实现方案里的"训练监控 + 早停判定"。
    返回每个 epoch 的平均损失列表。
    """
    # 预先特征化：特征只依赖文本，训练中不变，只有 W 变，缓存避免重复计算。
    q_feats = [_prefixed_features(s.query, "query") for s in samples]
    p_feats = [_prefixed_features(s.positive, "passage") for s in samples]
    hn_feats = [[_prefixed_features(h, "passage") for h in s.hard_negatives] for s in samples]

    epoch_losses: List[float] = []
    n = len(samples)
    for epoch in range(config.epochs):
        order = _lcg_shuffle(n, config.seed + epoch)
        epoch_loss = 0.0
        n_batches = 0
        for start in range(0, n, config.batch_size):
            batch_idx = order[start:start + config.batch_size]
            bq = [q_feats[i] for i in batch_idx]
            bp = [p_feats[i] for i in batch_idx]
            # 把 batch 内所有样本的难负例汇入候选池，强化对比。
            bneg: List[Vector] = []
            for i in batch_idx:
                bneg.extend(hn_feats[i])
            loss, grad_W = info_nce_loss_and_grad(model, bq, bp, bneg, config.temperature)
            # 梯度下降：W -= lr * grad
            for a in range(model.embed_dim):
                Wa, ga = model.W[a], grad_W[a]
                for b in range(model.feature_dim):
                    Wa[b] -= config.lr * ga[b]
            epoch_loss += loss
            n_batches += 1
        avg = epoch_loss / max(n_batches, 1)
        epoch_losses.append(avg)
        if on_epoch is not None:
            on_epoch(epoch, avg, model)
    return epoch_losses
