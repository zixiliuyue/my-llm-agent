"""检索评估指标测试：用手算可验证的小例子锁定 Recall/MRR/nDCG 语义。"""

import math
import unittest

from emberft import metrics


class TestMetrics(unittest.TestCase):
    def test_recall_at_k(self):
        # 相关文档 {a,b}，前 3 命中 a：recall@3 = 1/2
        ranking = ["a", "x", "y", "b"]
        self.assertAlmostEqual(metrics.recall_at_k(ranking, {"a", "b"}, 3), 0.5)
        # 前 4 命中 a,b：recall@4 = 1
        self.assertAlmostEqual(metrics.recall_at_k(ranking, {"a", "b"}, 4), 1.0)

    def test_mrr_first_hit_reciprocal(self):
        # 第一个相关文档在第 2 位：MRR = 1/2
        self.assertAlmostEqual(metrics.mrr_at_k(["x", "a", "b"], {"a"}, 10), 0.5)
        # 前 K 无命中：MRR = 0
        self.assertEqual(metrics.mrr_at_k(["x", "y"], {"a"}, 2), 0.0)

    def test_ndcg_perfect_is_one(self):
        # 相关文档排在第一位：nDCG = 1
        self.assertAlmostEqual(metrics.ndcg_at_k(["a", "x"], {"a"}, 10), 1.0)

    def test_ndcg_position_discount(self):
        # 相关文档在第 2 位：DCG=1/log2(3)，IDCG=1/log2(2)=1
        expected = (1.0 / math.log2(3)) / 1.0
        self.assertAlmostEqual(metrics.ndcg_at_k(["x", "a"], {"a"}, 10), expected)

    def test_aggregate_macro_average(self):
        rankings = {"q1": ["a", "b"], "q2": ["x", "c"]}
        qrels = {"q1": {"a"}, "q2": {"c"}}
        agg = metrics.aggregate(rankings, qrels, ks=(1, 2))
        # q1 recall@1=1, q2 recall@1=0 -> 宏平均 0.5
        self.assertAlmostEqual(agg["recall@1"], 0.5)
        self.assertAlmostEqual(agg["recall@2"], 1.0)


if __name__ == "__main__":
    unittest.main()
