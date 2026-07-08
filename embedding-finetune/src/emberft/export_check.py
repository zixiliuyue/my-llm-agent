"""导出与量化验证：模拟"导出到推理引擎 + INT8 量化 + 数值一致性校验"。

学习目标：真实链路是 optimum-cli 导出 ONNX、动态量化，再校验导出前后向量
余弦 > 0.999（方案第 5 节）。本地零依赖跑不了真 ONNX Runtime，
所以这里用等价的确定性数学复刻这一验证流程，把方法讲透：

- export_fp32：导出即原样搬运权重（占位"图优化无损转换"），用于流程演示。
- quantize_int8：对每行权重做 per-row 对称量化到 int8，再反量化。这是真实
  动态量化的核心数学，会引入可控的精度损失。
- consistency_report：在一批探针文本上比较原模型与导出模型的嵌入余弦，
  给出最小/平均余弦，据此判断是否 > 阈值（超阈值则回退 fp16/fp32）。
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Sequence, Tuple

from .linalg import cosine
from .model import EmbeddingModel


def export_fp32(model: EmbeddingModel) -> EmbeddingModel:
    """fp32 导出：复制权重生成新模型，模拟无损图优化导出。

    真实场景对应 optimum-cli export onnx（无量化）：算子重排但数值应完全一致，
    因此这里的一致性校验余弦必然 = 1.0，作为链路正确性的基准。
    """
    new_W = [row[:] for row in model.W]
    return EmbeddingModel(embed_dim=model.embed_dim, feature_dim=model.feature_dim, weight=new_W)


def quantize_int8(model: EmbeddingModel) -> Tuple[EmbeddingModel, List[float]]:
    """INT8 动态量化：对 W 每行做对称量化再反量化，返回 (量化后模型, 每行 scale)。

    per-row 对称量化数学：
        scale = max(|row|) / 127
        q = round(row / scale)  ∈ [-127,127]
        dequant = q * scale
    这是 ONNX Runtime / TensorRT 动态量化的等价核心。量化误差随权重分布变化，
    正是"量化后要重新校验精度"的原因。
    """
    new_W: List[List[float]] = []
    scales: List[float] = []
    for row in model.W:
        amax = max((abs(x) for x in row), default=0.0)
        scale = amax / 127.0 if amax > 0 else 1.0
        scales.append(scale)
        q_row = [round(x / scale) for x in row]
        # 夹取到 int8 范围，模拟真实溢出饱和
        q_row = [max(-127, min(127, q)) for q in q_row]
        deq = [q * scale for q in q_row]
        new_W.append(deq)
    return EmbeddingModel(embed_dim=model.embed_dim, feature_dim=model.feature_dim,
                          weight=new_W), scales


@dataclass
class ConsistencyReport:
    """导出一致性报告。"""
    min_cosine: float
    avg_cosine: float
    n_probes: int
    passed: bool
    threshold: float

    def summary(self) -> str:
        status = "PASS" if self.passed else "FAIL"
        return (f"[{status}] 探针数={self.n_probes} 最小余弦={self.min_cosine:.6f} "
                f"平均余弦={self.avg_cosine:.6f} 阈值>{self.threshold}")


def consistency_report(original: EmbeddingModel, exported: EmbeddingModel,
                       probes: Sequence[str], threshold: float = 0.999) -> ConsistencyReport:
    """在探针文本上比较原模型与导出模型的嵌入余弦一致性。

    方案的部署验证第①步：导出前后 embedding 余弦 > 0.999 才算转换无损。
    对每条探针分别以 query 和 passage 前缀编码（覆盖非对称两路），取全部余弦的
    最小值和平均值。min_cosine 才是能否放行的关键——平均高但个别塌陷也要拦。
    """
    cosines: List[float] = []
    for text in probes:
        for kind in ("query", "passage"):
            a = original.encode(text, kind)
            b = exported.encode(text, kind)
            cosines.append(cosine(a, b))
    if not cosines:
        return ConsistencyReport(0.0, 0.0, 0, False, threshold)
    mn = min(cosines)
    avg = sum(cosines) / len(cosines)
    return ConsistencyReport(mn, avg, len(cosines), mn > threshold, threshold)
