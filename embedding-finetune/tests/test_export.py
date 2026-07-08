"""导出与量化验证测试：数值一致性、INT8 量化误差可控。"""

import unittest

from emberft.model import EmbeddingModel
from emberft import export_check


class TestExportCheck(unittest.TestCase):
    def setUp(self):
        self.model = EmbeddingModel(embed_dim=32)
        self.probes = ["发布回滚流程", "慢查询优化索引", "对比学习微调嵌入", "权限过滤检索"]

    def test_fp32_export_is_lossless(self):
        """fp32 导出应完全无损：所有探针余弦=1，通过 0.999 阈值。"""
        exported = export_check.export_fp32(self.model)
        rep = export_check.consistency_report(self.model, exported, self.probes, threshold=0.999)
        self.assertTrue(rep.passed)
        self.assertAlmostEqual(rep.min_cosine, 1.0, places=6)

    def test_int8_quantization_high_consistency(self):
        """INT8 量化误差可控：最小余弦应仍很高（>0.99），通过 0.95 阈值。"""
        int8, scales = export_check.quantize_int8(self.model)
        rep = export_check.consistency_report(self.model, int8, self.probes, threshold=0.95)
        self.assertTrue(rep.passed)
        self.assertGreater(rep.min_cosine, 0.99)
        # 每行都应有正的 scale
        self.assertTrue(all(s > 0 for s in scales))

    def test_int8_weights_actually_changed(self):
        """量化确实改动了权重（引入误差），不是原样复制。"""
        int8, _ = export_check.quantize_int8(self.model)
        changed = any(
            self.model.W[a][b] != int8.W[a][b]
            for a in range(self.model.embed_dim)
            for b in range(0, self.model.feature_dim, 17)  # 抽样比较
        )
        self.assertTrue(changed)

    def test_empty_probes_fails_safe(self):
        """无探针时报告不通过，避免"没校验"被误判为通过。"""
        rep = export_check.consistency_report(self.model, self.model, [], threshold=0.999)
        self.assertFalse(rep.passed)


if __name__ == "__main__":
    unittest.main()
