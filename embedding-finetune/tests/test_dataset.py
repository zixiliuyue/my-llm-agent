"""数据工程测试：去噪、长度过滤、MinHash 去重、泄漏检测、平衡、难负例挖掘。"""

import unittest

from emberft import dataset


class TestDataset(unittest.TestCase):
    def test_clean_text_strips_html_and_ws(self):
        out = dataset.clean_text("<p>发布  回滚</p>\n\t流程")
        self.assertNotIn("<", out)
        self.assertEqual(out, "发布 回滚 流程")

    def test_length_filter(self):
        self.assertFalse(dataset.length_filter("短", min_len=2))
        self.assertTrue(dataset.length_filter("足够长的一段文本", min_len=2))
        self.assertFalse(dataset.length_filter("x" * 1000, max_len=512))

    def test_minhash_near_duplicate_high_jaccard(self):
        """近重文本的 MinHash Jaccard 估计应偏高，无关文本偏低。"""
        a = dataset.minhash_signature("发布回滚需先停止流量再切换旧版本")
        b = dataset.minhash_signature("发布回滚需先停止流量再切换到旧版本")  # 仅多一字
        c = dataset.minhash_signature("今天天气很好适合出门散步锻炼身体")
        self.assertGreater(dataset.jaccard_estimate(a, b), dataset.jaccard_estimate(a, c))
        self.assertGreater(dataset.jaccard_estimate(a, b), 0.5)

    def test_dedup_removes_near_duplicate(self):
        samples = [
            dataset.RawSample("回滚发布", "发布回滚需先停止流量再切换旧版本", []),
            dataset.RawSample("回滚发布", "发布回滚需先停止流量再切换旧版本", []),  # 完全重复
            dataset.RawSample("慢查询", "慢查询要看执行计划走索引", []),
        ]
        kept, dropped = dataset.dedup_samples(samples, threshold=0.8)
        self.assertEqual(len(kept), 2)
        self.assertEqual(dropped, [1])

    def test_detect_leakage(self):
        """训练正例与评测语料近重应被检出为泄漏。"""
        train_pos = ["发布回滚需先停止流量再切换旧版本", "无关的其它内容随便写点"]
        eval_texts = ["发布回滚需先停止流量再切换旧版本", "完全不同的评测文档"]
        leaks = dataset.detect_leakage(train_pos, eval_texts, threshold=0.8)
        self.assertTrue(any(ti == 0 and ei == 0 for ti, ei, _ in leaks))

    def test_balance_negatives_aligns_count(self):
        samples = [
            dataset.RawSample("q1", "p1", ["n1", "n2", "n3"]),
            dataset.RawSample("q2", "p2", ["n4"]),
        ]
        balanced = dataset.balance_negatives(samples)  # target=3
        self.assertTrue(all(len(s.hard_negatives) == 3 for s in balanced))

    def test_mine_hard_negatives_excludes_positive(self):
        """难负例挖掘不应把与正例近重的候选当负例（假负例过滤）。"""
        def fake_encode(text, kind):
            # 简单编码：命中关键词就给高相似，纯演示挖掘逻辑
            return [1.0 if "回滚" in text else 0.0, 1.0 if "索引" in text else 0.0]

        corpus = [
            ("c1", "发布回滚相关但不是正例的另一段"),   # 与 query 高相似 -> 难负例
            ("c2", "慢查询要看执行计划走索引"),          # 无关
            ("c3", "发布回滚需先停止流量再切换旧版本"),  # 与正例近重 -> 应排除
        ]
        mined = dataset.mine_hard_negatives(
            "如何回滚发布", "发布回滚需先停止流量再切换旧版本", corpus,
            encode=fake_encode, top_n=3, exclude_threshold=0.8,
        )
        self.assertNotIn("发布回滚需先停止流量再切换旧版本", mined)


if __name__ == "__main__":
    unittest.main()
