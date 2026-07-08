"""数据工程：清洗、去重、去泄漏、平衡、难负例挖掘（纯标准库）。

学习目标：方案第 3 节的数据集构建标准落成可运行、可测试的确定性代码。
数据质量决定微调上限，这一层比训练循环更值得写实。

覆盖：
- clean_text        去噪：去 HTML 标签、压缩空白、剥控制字符
- length_filter     长度过滤：太短无信息、太长易含噪
- minhash_signature 近重去重：MinHash 签名 + Jaccard 估计
- dedup_samples     基于近重的样本去重
- detect_leakage    train/eval 泄漏检测（正例文本近重出现在评测语料）
- balance_negatives 平衡：每条样本难负例数量对齐
- mine_hard_negatives 难负例挖掘：用基座检索高相似但非正确的段落
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from typing import Callable, Dict, List, Sequence, Set, Tuple

_HTML_TAG = re.compile(r"<[^>]+>")
_WS = re.compile(r"\s+")
_CTRL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def clean_text(text: str) -> str:
    """去噪：剥离 HTML 标签、控制字符，压缩连续空白。

    真实语料常含网页残留标签和乱码控制符，不清洗会污染特征。
    """
    text = _HTML_TAG.sub(" ", text)
    text = _CTRL.sub(" ", text)
    text = _WS.sub(" ", text)
    return text.strip()


def length_filter(text: str, min_len: int = 4, max_len: int = 512) -> bool:
    """长度过滤：按字符数判断是否保留。

    过短（如单字/空串）无检索信息，过长易夹杂多主题噪声，都不利于对比学习。
    返回 True 表示保留。
    """
    n = len(text.strip())
    return min_len <= n <= max_len


def _shingles(text: str, k: int = 3) -> Set[str]:
    """把文本切成 k-字符 shingle 集合，作为 MinHash 的输入元素。

    中文用字符级 shingle 即可捕捉近重；先做 clean+去空白保证稳定。
    """
    s = _WS.sub("", clean_text(text))
    if len(s) < k:
        return {s} if s else set()
    return {s[i:i + k] for i in range(len(s) - k + 1)}


def minhash_signature(text: str, num_perm: int = 32, k: int = 3) -> Tuple[int, ...]:
    """计算文本的 MinHash 签名（num_perm 个最小哈希值）。

    原理：对每个 shingle 用 num_perm 组不同哈希函数取值，各组取最小值。
    两文本签名相同分量的比例 ≈ 它们 shingle 集合的 Jaccard 相似度。
    用确定性哈希（md5+盐）而非内置 hash，保证跨进程可复现。
    """
    shingles = _shingles(text, k)
    if not shingles:
        return tuple([0] * num_perm)
    sig: List[int] = []
    for p in range(num_perm):
        salt = str(p).encode("utf-8")
        mn = min(
            int.from_bytes(hashlib.md5(salt + sh.encode("utf-8")).digest()[:8], "big")
            for sh in shingles
        )
        sig.append(mn)
    return tuple(sig)


def jaccard_estimate(sig_a: Sequence[int], sig_b: Sequence[int]) -> float:
    """用两个 MinHash 签名估计 Jaccard 相似度（相同分量占比）。"""
    if not sig_a or len(sig_a) != len(sig_b):
        return 0.0
    same = sum(1 for x, y in zip(sig_a, sig_b) if x == y)
    return same / len(sig_a)


@dataclass
class RawSample:
    """清洗前的原始训练样本。"""
    query: str
    positive: str
    hard_negatives: List[str]


def dedup_samples(samples: List[RawSample], threshold: float = 0.8) -> Tuple[List[RawSample], List[int]]:
    """基于正例近重的样本去重。

    以 (query+positive) 的 MinHash 签名判定近重：Jaccard ≥ threshold 视为重复，
    只保留先出现的一条。返回 (保留样本, 被丢弃的原始下标列表)。
    """
    kept: List[RawSample] = []
    kept_sigs: List[Tuple[int, ...]] = []
    dropped: List[int] = []
    for idx, s in enumerate(samples):
        sig = minhash_signature(s.query + " " + s.positive)
        if any(jaccard_estimate(sig, ks) >= threshold for ks in kept_sigs):
            dropped.append(idx)
            continue
        kept.append(s)
        kept_sigs.append(sig)
    return kept, dropped


def detect_leakage(train_positives: Sequence[str], eval_texts: Sequence[str],
                   threshold: float = 0.8) -> List[Tuple[int, int, float]]:
    """泄漏检测：训练正例与评测语料近重即视为泄漏。

    返回 [(train_idx, eval_idx, jaccard), ...]。方案强调 train/eval 不能重叠，
    否则指标虚高。检测出的泄漏项应在切分阶段剔除。
    """
    eval_sigs = [minhash_signature(t) for t in eval_texts]
    hits: List[Tuple[int, int, float]] = []
    for ti, tp in enumerate(train_positives):
        tsig = minhash_signature(tp)
        for ei, esig in enumerate(eval_sigs):
            j = jaccard_estimate(tsig, esig)
            if j >= threshold:
                hits.append((ti, ei, j))
    return hits


def balance_negatives(samples: List[RawSample], target: int | None = None) -> List[RawSample]:
    """平衡：把每条样本的难负例数量对齐到 target。

    不足则循环复用已有负例补齐，超出则截断。数量一致可避免某些样本
    因负例多而在批内主导对比损失（方案的数据平衡要求）。
    target 默认取所有样本里最大的难负例数。
    """
    if not samples:
        return samples
    if target is None:
        target = max(len(s.hard_negatives) for s in samples)
    balanced: List[RawSample] = []
    for s in samples:
        negs = list(s.hard_negatives)
        if not negs:
            balanced.append(RawSample(s.query, s.positive, []))
            continue
        if len(negs) > target:
            negs = negs[:target]
        else:
            i = 0
            while len(negs) < target:
                negs.append(s.hard_negatives[i % len(s.hard_negatives)])
                i += 1
        balanced.append(RawSample(s.query, s.positive, negs))
    return balanced


def mine_hard_negatives(
    query: str,
    positive: str,
    corpus: List[Tuple[str, str]],
    encode: Callable[[str, str], Sequence[float]],
    top_n: int = 3,
    exclude_threshold: float = 0.85,
) -> List[str]:
    """难负例挖掘：用基座 encode 检索与 query 高相似但非正例的段落。

    参数：
        corpus: [(doc_id, text)]，候选负例来源池
        encode: 基座编码函数 encode(text, kind) -> 向量（传入未微调模型即"用基座挖掘"）
        exclude_threshold: 与正例过于相似的候选剔除，防止把"其实是正例"的段落误当负例（假负例）
    做法：算 query 向量与各候选的余弦，降序取高相似的前 top_n；
    同时排除与 positive 近重（可能是真正例）的候选。这正是方案说的
    "取高相似但非正确的 Top 结果"。
    """
    from .linalg import cosine

    q_vec = encode(query, "query")
    pos_sig = minhash_signature(positive)
    scored: List[Tuple[float, str]] = []
    for _, text in corpus:
        # 跳过就是正例本身或与正例近重的候选（假负例过滤）
        if jaccard_estimate(minhash_signature(text), pos_sig) >= exclude_threshold:
            continue
        d_vec = encode(text, "passage")
        scored.append((cosine(q_vec, d_vec), text))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [t for _, t in scored[:top_n]]
