"""文本特征化：把中文文本变成稀疏的 bag-of-ngram 词频向量。

学习目标：真实嵌入模型第一步是分词/子词切分，这里用"字 + 相邻字 bigram"
近似中文子词，再用特征哈希（feature hashing）映射到固定维度，避免维护动态词表。

为什么这样设计：
- 中文没有空格分词，字级 + bigram 能在零依赖下抓住局部语义（"回滚""版本"等）。
- 特征哈希把任意 token 稳定映射到固定槽位，训练/推理/导出三处维度恒定，
  这是能做数值一致性校验（导出前后余弦 >0.999）的前提。
- 输出做 L2 归一化，让不同长度文本的特征尺度可比，稳定后续对比学习梯度。
"""

from __future__ import annotations

import hashlib
import re
from typing import Dict

from .linalg import Vector

# 特征哈希维度：token 通过哈希落到 [0, FEATURE_DIM) 的槽位。
# 512 对本教学语料（几十条）足够稀疏、几乎无碰撞，又保持向量小巧。
FEATURE_DIM = 512

# 匹配连续的非中文非空白片段（英文单词、数字、如 503/P99/BM25/InfoNCE），整体当一个 token。
_LATIN_TOKEN = re.compile(r"[A-Za-z0-9]+")
# 判定单个中文字符（用于字级 + bigram 切分）。
_CJK_CHAR = re.compile(r"[一-鿿]")


def tokenize(text: str) -> list[str]:
    """把文本切成 token 列表。

    规则：
    - 连续英文/数字整体成词（保留 503、P99、BM25 这类领域术语）。
    - 中文按单字成 token，并对相邻两字额外生成 bigram，兼顾字义和局部搭配。
    这样 "如何回滚" 会产生 如/何/回/滚 及 如何/何回/回滚，
    使 "回滚" 与 "版本回退" 能共享部分特征。
    """
    text = text.lower().strip()
    tokens: list[str] = []
    # 先抽出所有英文/数字片段，占位后单独处理中文，避免二者互相干扰。
    latin_spans = [(m.start(), m.end(), m.group()) for m in _LATIN_TOKEN.finditer(text)]
    latin_ranges = {i for s, e, _ in latin_spans for i in range(s, e)}
    for _, _, tok in latin_spans:
        tokens.append(f"w:{tok}")

    # 逐字扫描中文，生成字级 token 和相邻 bigram。
    cjk_chars: list[str] = []
    for idx, ch in enumerate(text):
        if idx in latin_ranges:
            # 该位置属于英文/数字片段，中文 bigram 在此断开。
            if cjk_chars:
                _emit_cjk(cjk_chars, tokens)
                cjk_chars = []
            continue
        if _CJK_CHAR.match(ch):
            cjk_chars.append(ch)
        else:
            # 标点/空白：作为中文序列的天然分隔，结算当前累积。
            if cjk_chars:
                _emit_cjk(cjk_chars, tokens)
                cjk_chars = []
    if cjk_chars:
        _emit_cjk(cjk_chars, tokens)
    return tokens


def _emit_cjk(chars: list[str], out: list[str]) -> None:
    """把一段连续中文结算成字级 token 和相邻 bigram，写入 out。"""
    for i, ch in enumerate(chars):
        out.append(f"c:{ch}")
        if i + 1 < len(chars):
            out.append(f"b:{ch}{chars[i + 1]}")


def _hash_index(token: str) -> int:
    """把 token 稳定哈希到 [0, FEATURE_DIM) 的槽位。

    用 md5 而非内置 hash()：内置 hash 对字符串带随机化种子，
    跨进程不稳定，会破坏"导出前后一致"这一核心保证。
    """
    digest = hashlib.md5(token.encode("utf-8")).digest()
    return int.from_bytes(digest[:4], "big") % FEATURE_DIM


def featurize(text: str) -> Vector:
    """把文本转成 L2 归一化的稠密特征向量（长度 FEATURE_DIM）。

    词频（tf）累加到哈希槽位后做 L2 归一化：长文档不会因为词多而整体尺度偏大，
    与短查询可比，这对非对称检索（短 query vs 长 passage）尤其重要。
    """
    counts: Dict[int, float] = {}
    for tok in tokenize(text):
        idx = _hash_index(tok)
        counts[idx] = counts.get(idx, 0.0) + 1.0
    vec = [0.0] * FEATURE_DIM
    for idx, c in counts.items():
        vec[idx] = c
    # L2 归一化
    n = sum(v * v for v in vec) ** 0.5
    if n > 0.0:
        vec = [v / n for v in vec]
    return vec
