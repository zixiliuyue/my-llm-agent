"""特征化与向量运算测试。"""

import unittest

from emberft import features
from emberft import linalg


class TestFeatures(unittest.TestCase):
    def test_featurize_dim_and_normalized(self):
        """特征向量维度固定为 FEATURE_DIM 且 L2 归一化（长度约等于 1）。"""
        v = features.featurize("如何回滚线上发布")
        self.assertEqual(len(v), features.FEATURE_DIM)
        self.assertAlmostEqual(linalg.norm(v), 1.0, places=6)

    def test_featurize_deterministic(self):
        """同一文本特征化结果确定（哈希用 md5，不受进程随机化影响）。"""
        a = features.featurize("发布回退到旧版本")
        b = features.featurize("发布回退到旧版本")
        self.assertEqual(a, b)

    def test_similar_text_closer_than_unrelated(self):
        """近义文本的特征余弦应高于无关文本，说明字级+bigram 抓到了共享语义。"""
        base = features.featurize("如何回滚线上发布")
        near = features.featurize("线上发布怎么回滚")
        far = features.featurize("今天天气很好适合散步")
        self.assertGreater(linalg.cosine(base, near), linalg.cosine(base, far))

    def test_latin_tokens_preserved(self):
        """英文/数字术语整体成词：503 与 P99 不被拆成单字符。"""
        toks = features.tokenize("服务 503 错误 P99 升高")
        self.assertIn("w:503", toks)
        self.assertIn("w:p99", toks)


class TestLinalg(unittest.TestCase):
    def test_softmax_sums_to_one(self):
        s = linalg.softmax([1.0, 2.0, 3.0])
        self.assertAlmostEqual(sum(s), 1.0, places=9)

    def test_normalize_unit_length(self):
        v = linalg.normalize([3.0, 4.0])
        self.assertAlmostEqual(linalg.norm(v), 1.0, places=9)

    def test_normalize_zero_vector_safe(self):
        """零向量归一化不崩溃，返回零向量。"""
        self.assertEqual(linalg.normalize([0.0, 0.0]), [0.0, 0.0])

    def test_cosine_identical_is_one(self):
        self.assertAlmostEqual(linalg.cosine([1.0, 2.0, 3.0], [1.0, 2.0, 3.0]), 1.0, places=9)


if __name__ == "__main__":
    unittest.main()
