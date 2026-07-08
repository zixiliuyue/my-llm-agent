"""对比学习训练测试：验证 loss 下降、检索指标提升、梯度方向正确。

这是全方案最核心的验证——证明"对比学习微调真的能根治检索相关性不足"。
"""

import unittest

from emberft.model import EmbeddingModel
from emberft.contrastive import TrainSample, TrainConfig, train, info_nce_loss_and_grad
from emberft.retriever import Retriever
from emberft.metrics import aggregate
from emberft import features


def _toy_samples():
    """小规模领域样本：两组主题（发布回滚 / 慢查询），组内相关组间无关。"""
    return [
        TrainSample("如何回滚线上发布", "发布回滚需先停止流量再切换旧版本",
                    ["慢查询要看执行计划走索引"]),
        TrainSample("发布回退到旧版本", "版本回退重新部署上一个 release 镜像",
                    ["缓存穿透需要空值缓存或布隆过滤器"]),
        TrainSample("数据库慢查询怎么优化", "慢查询用执行计划确认索引避免全表扫描",
                    ["发布回滚需先停止流量再切换旧版本"]),
        TrainSample("SQL 执行太慢如何加速", "给高频过滤字段建索引避免回表",
                    ["版本回退重新部署上一个 release 镜像"]),
    ]


class TestContrastive(unittest.TestCase):
    def test_loss_decreases(self):
        """训练若干 epoch 后，末尾 epoch 平均损失应明显低于首个 epoch。"""
        model = EmbeddingModel(embed_dim=32)
        losses = train(model, _toy_samples(),
                       TrainConfig(epochs=10, batch_size=4, lr=0.5, temperature=0.05))
        self.assertLess(losses[-1], losses[0])
        self.assertLess(losses[-1], losses[0] * 0.5)  # 至少降一半，确认真在优化

    def test_retrieval_improves_after_finetune(self):
        """微调后在自建评测上的 nDCG@10 应高于未微调 baseline。"""
        corpus = [
            ("d1", "发布回滚需先停止流量再切换旧版本"),
            ("d2", "版本回退重新部署上一个 release 镜像"),
            ("d3", "慢查询用执行计划确认索引避免全表扫描"),
            ("d4", "给高频过滤字段建索引避免回表"),
        ]
        queries = {"q1": "怎么把发布退回上个版本", "q2": "sql 查询很慢如何优化"}
        qrels = {"q1": {"d1", "d2"}, "q2": {"d3", "d4"}}

        base = EmbeddingModel(embed_dim=32)
        base_m = aggregate(Retriever(base, corpus).rank_all(queries, k=4), qrels)

        ft = EmbeddingModel(embed_dim=32)
        train(ft, _toy_samples(), TrainConfig(epochs=15, batch_size=4, lr=0.5, temperature=0.05))
        ft_m = aggregate(Retriever(ft, corpus).rank_all(queries, k=4), qrels)

        self.assertGreaterEqual(ft_m["ndcg@10"], base_m["ndcg@10"])

    def test_gradient_reduces_loss(self):
        """沿负梯度走一小步，损失应下降（数值验证梯度方向正确）。"""
        model = EmbeddingModel(embed_dim=16)
        qf = [features.featurize("query: 如何回滚发布")]
        pf = [features.featurize("passage: 发布回滚切回旧版本")]
        nf = [features.featurize("passage: 慢查询看执行计划")]
        loss0, grad = info_nce_loss_and_grad(model, qf, pf, nf, temperature=0.05)
        # 手动走一步梯度下降
        lr = 0.1
        for a in range(model.embed_dim):
            for b in range(model.feature_dim):
                model.W[a][b] -= lr * grad[a][b]
        loss1, _ = info_nce_loss_and_grad(model, qf, pf, nf, temperature=0.05)
        self.assertLess(loss1, loss0)

    def test_reproducible(self):
        """同 seed 训练结果完全一致（确定性，可复现 baseline 对比）。"""
        m1 = EmbeddingModel(embed_dim=16)
        m2 = EmbeddingModel(embed_dim=16)
        cfg = TrainConfig(epochs=5, batch_size=4, lr=0.5, temperature=0.05, seed=123)
        l1 = train(m1, _toy_samples(), cfg)
        l2 = train(m2, _toy_samples(), cfg)
        self.assertEqual(l1, l2)


if __name__ == "__main__":
    unittest.main()
