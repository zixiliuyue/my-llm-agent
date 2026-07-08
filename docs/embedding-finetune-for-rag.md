# 从 0 到 1 微调嵌入模型：RAG 性能优化方案

> 说明：本文件是**方案文档**，并已配套**可运行实现**落地在 `embedding-finetune/`。
> 现有 Node.js 教学平台无真实 ML 能力，故按方案设计了不 import 任何 day 的独立 Python 线，
> 环境**同时兼容 CPU 与 RTX 5060Ti 16G**：
> - **默认可跑路径**（纯标准库，无第三方依赖）：真实对比学习训练循环 + 检索指标 + 导出验证，
>   `python3 embedding-finetune/scripts/pipeline.py` 即可复现 baseline→微调的指标提升。
> - **真实 GPU 实训线**（sentence-transformers/optimum）：`embedding-finetune/scripts/real_finetune.py`，
>   遵循仓库 local-only 边界，需手动装依赖、显式执行，不进默认测试。
>
> 实测（默认流水线，确定性可复现）：Recall@10 0.80→1.00、MRR@10 0.50→0.81、nDCG@10 0.57→0.86；
> 导出 fp32 余弦=1.0、INT8 余弦>0.9999、检索指标零回退。详见 `embedding-finetune/README.md`。

---

## 0. 现有项目能力评估（先摆证据）

与本主题相关的仅三处代码，均为教学 mock，不具备真实嵌入/训练能力：

| 位置 | 实际实现 | 与"微调嵌入模型"的差距 |
|---|---|---|
| `day03-memory-and-rag/src/retriever.js` | 关键词重合度打分（title +2 / body +1），无向量 | 纯词面匹配，无嵌入 |
| `day59-production-rag-knowledge-base/src/index.js` `embedText` | 确定性哈希 `charCodeAt % 37`，12 维 | 占位向量，无语义，同义句无法靠近 |
| `day73-rag-faithfulness-check/src/index.js` | 字符 bigram 重合度模拟 NLI | 评估侧 mock，无模型 |

**结论**：
- 项目对"RAG 检索链路工程"（chunk、hybrid search、权限过滤、缓存、增量更新、召回评估、忠实度检测）讲解到位，工程骨架清晰、中文注释质量高、边界标注诚实（`docs/job-requirement-gap-analysis.md` 已注明 day59 需接真实 embedding）。
- 但对"从 0 到 1 微调嵌入模型"这一核心命题，**技术深度 2/10**：语言生态错配（JS vs Python ML 生态）、无学习型向量、无对比学习、无训练循环、无导出链路。
- 因此本主题**无法在现有 JS 代码内实现**，需新增独立 Python 实战线（本方案）。

---

## 1. RAG "答非所问" 技术成因

| 成因层 | 机制 | 诊断信号 | 主要归责 |
|---|---|---|---|
| 检索相关性不足 | 通用嵌入把领域近义词（回滚/rollback/版本回退）映射到不同区域，Top-K 无正确 chunk | Recall@K 低、正确文档 rank 靠后 | **嵌入微调可解** |
| 嵌入语义偏差 | 预训练分布 ≠ 领域分布；query(短) 与 doc(长) 非对称，通用对称训练偏移 | 相似度分布压缩、正负样本不可分 | **嵌入微调可解** |
| 上下文窗口限制 | 召回对了塞不下；chunk 切分破坏语义 | 答案缺中间信息 | 切分策略 / 重排 |
| 知识更新滞后 | 索引未增量更新，检索旧版本 | citation 指向过期文档 | ingestion 增量更新 |
| 重排缺失 / 生成幻觉 | 召回对但排序错；LLM 无视证据编造 | faithfulness 低 | reranker / 忠实度校验 |

**根因是前两项**，正是本方案要用"微调嵌入模型"根治的目标。

---

## 2. 嵌入模型原理与微调收益

**原理**：嵌入模型是双塔/单塔 Transformer 编码器，文本经 mean/CLS pooling 压成定长稠密向量，使语义相近文本余弦相似度高；检索 = query 向量的最近邻搜索。

**微调为何根治**（对比学习）：
- **目标函数**：InfoNCE / 对比损失，拉近 (query, 正例)、推远 (query, 负例)，尤其**难负例（语义近但答案错）**。
- **领域适配**：注入领域正负样本，模型学会"本领域什么算相关"，纠正分布偏移。
- **非对称适配**：query/doc 用不同 instruction 前缀（`query: ` / `passage: `），修正长短文本不对称。

**可量化改善（经验区间，须以自建评测集为准）**：

| 指标 | 微调前 | 微调后 |
|---|---|---|
| Recall@10 | 0.60–0.70 | 0.85–0.95 |
| MRR@10 | ~0.45 | 0.70+ |
| nDCG@10 | 0.5x | 0.7x–0.8x |
| 下游 RAG 答案准确率 | baseline | +10~25pp |

---

## 3. 基座选型框架 + 数据集构建标准

**基座评估维度**：

| 维度 | 关注点 | 候选（中文优先） |
|---|---|---|
| 架构/pooling | mean vs cls、是否支持 instruction | BGE 系列、GTE、E5、bge-m3 |
| 参数量/延迟 | small(~30M)/base(~110M)/large(~330M) 精度-延迟权衡 | 5060Ti 可跑 base/large |
| 预训练分布 | 覆盖语言/领域 | 中文避免纯英文模型 |
| 基准 | MTEB / C-MTEB retrieval 榜 | 榜单 + 自建集双验证 |
| 维度/长度 | 向量维度、max seq len | 长文档选 bge-m3(8k) |

**数据集构建标准**：
1. 样本形态：`(query, positive_passage, hard_negatives[])`。
2. 正例来源：真实问答日志、FAQ、文档标题-正文、人工标注。
3. **难负例挖掘**：用基座先检索，取"高相似但非正确"的 Top 结果（BM25 负例 + 向量负例混合）。
4. 清洗流程：去重（MinHash/近重）→ 去噪（HTML/乱码）→ 长度过滤 → **泄漏检测（train/eval 不重叠）** → 平衡（每 query 负例数一致）。
5. 质量指标：正负可分度、query 多样性、领域覆盖率、标注一致性（多人 kappa）。
6. 规模：领域适配起步 5k–50k 对，下限 1k+ 亦可见效。

---

## 4. 完整微调技术流程（CPU / 5060Ti 双兼容设计）

**技术栈**：Python + `sentence-transformers`（最省心）或 `FlagEmbedding`（BGE 官方）。

**双环境策略**（关键）：
- **CPU / CI 冒烟**：基座换 `paraphrase-multilingual-MiniLM-L12-v2`（~118M）或 `bge-small-zh`，样本几十条、`epochs=1`、`batch=8`、`fp16=False`，只验证"训练循环+评估器+导出"能跑通，几分钟完成。
- **RTX 5060Ti 16G 实训**：基座 `BAAI/bge-base-zh-v1.5` 或 `bge-large-zh-v1.5`，开 `fp16=True`、`batch=32~64`、`epochs=3`，显存足够；大 batch 强化批内负例效果。用环境变量切换，同一份代码两处跑。

```python
# 环境：pip install sentence-transformers datasets accelerate
# CPU 冒烟：EMB_BASE=bge-small-zh EMB_BATCH=8 EMB_EPOCHS=1 EMB_FP16=0
# GPU 实训：EMB_BASE=BAAI/bge-base-zh-v1.5 EMB_BATCH=32 EMB_EPOCHS=3 EMB_FP16=1
import os
from sentence_transformers import SentenceTransformer, losses, InputExample
from sentence_transformers.evaluation import InformationRetrievalEvaluator
from torch.utils.data import DataLoader

# 1) 基座（按环境变量切换，实现 CPU/GPU 双兼容）
model = SentenceTransformer(os.getenv("EMB_BASE", "BAAI/bge-base-zh-v1.5"))

# 2) 数据加载：query-positive 对（可扩展 hard negative 三元组）
train_examples = [
    InputExample(texts=["如何回滚发布", "发布回滚需先停止流量再切换旧版本..."]),
    # ... 领域样本
]
train_loader = DataLoader(train_examples, shuffle=True,
                          batch_size=int(os.getenv("EMB_BATCH", "32")))

# 3) 损失：MultipleNegativesRankingLoss = 批内负例 InfoNCE，最适检索
train_loss = losses.MultipleNegativesRankingLoss(model)

# 4) 评估器：训练中直接算 Recall/MRR/nDCG（收敛判定依据）
ir_evaluator = InformationRetrievalEvaluator(
    queries=eval_queries, corpus=eval_corpus, relevant_docs=eval_qrels,
    name="domain-eval",
)

# 5) 训练循环 + 监控 + 早停最优保存
model.fit(
    train_objectives=[(train_loader, train_loss)],
    evaluator=ir_evaluator,
    epochs=int(os.getenv("EMB_EPOCHS", "3")),
    warmup_steps=int(0.1 * len(train_loader)),
    optimizer_params={"lr": 2e-5},
    use_amp=os.getenv("EMB_FP16", "1") == "1",  # GPU 开 fp16，CPU 关
    evaluation_steps=200,
    save_best_model=True,          # 收敛判定：eval 指标平台期即最优
    output_path="./bge-domain-ft",
)
```

**超参调优**：lr `1e-5~3e-5`；batch 越大批内负例越多、对比学习越强；epochs 1–5；warmup 10%。
**收敛判定**：eval 集 nDCG@10 进入平台期 + train loss 稳定，早停防过拟合。
**监控**：loss 曲线、eval 检索指标曲线、正负样本相似度分布。

---

## 5. 导出到推理引擎

| 引擎 | 转换路径 | 优化 | 验证 |
|---|---|---|---|
| **ONNX Runtime** | `optimum-cli export onnx --model ./bge-domain-ft onnx/` | 图优化 + INT8 动态量化，CPU 提速 2–4× | 导出前后 embedding 余弦 >0.999 |
| **TorchServe** | TorchScript `torch.jit.trace` + `handler.py`(tokenize+pooling) | batch inference、多副本 | REST `/predictions` 回归 |
| **TF Serving** | ONNX→TF(`onnx-tf`) 或导出 SavedModel | 固定 SignatureDef | grpc/REST 打分一致性 |
| 高吞吐 | Triton + ONNX backend | dynamic batching、FP16 | 压测 P99 |

**部署验证流程**：①数值一致性（余弦 >0.999）②检索指标不回退（重跑 eval 集）③性能基线（QPS/P99）④灰度对比线上 RAG 答案质量。

---

## 6. 面试核心考察点

| 维度 | 高频问题 |
|---|---|
| 原理 | 为何用对比学习而非分类？InfoNCE 温度系数作用？难负例为何关键？mean vs CLS pooling？ |
| 工程 | 难负例怎么挖？数据泄漏怎么防？query/doc 不对称怎么处理？索引增量更新？ |
| 调优 | batch size 为何影响对比学习？过拟合信号与早停？lr/warmup 依据？ |
| 排查 | "答非所问"如何定位召回 vs 生成？（先看 Recall@K 再看 faithfulness）指标掉了如何二分归因？ |
| 落地 | 微调 vs RAG vs 重排何时用？量化后精度损失如何评估？ |

---

## 7. 系统化解决方案

### 7.1 技术路线图（4 阶段）

```
阶段一 基线与评测集     阶段二 数据工程        阶段三 微调与评估       阶段四 导出与验证
─────────────────    ────────────────     ─────────────────    ─────────────────
· 选基座(bge-base)     · 样本对采集          · 对比学习微调         · ONNX 导出+量化
· 建自建评测集         · 难负例挖掘          · 训练监控/早停        · 引擎适配(Triton等)
· 跑 baseline 指标     · 清洗/去泄漏         · Recall/MRR/nDCG      · 数值一致性验证
  (Recall/MRR/nDCG)   · 数据质量评估         · 对比 baseline        · 灰度线上 A/B
```

### 7.2 关键实施步骤

1. **建评测集**：从领域真实问题抽 200–500 条 query + qrels，作为唯一"真相尺子"。
2. **跑 baseline**：用通用基座测 Recall@10/MRR/nDCG，锁定改进空间。
3. **数据工程**：采集正例对 → 基座挖难负例 → 清洗去泄漏 → 质量校验。
4. **微调**：先 CPU 小样本冒烟跑通链路，再上 5060Ti 全量实训。
5. **评估**：与 baseline 同评测集对比，指标不升则回到数据工程。
6. **导出验证**：ONNX/量化后余弦一致性 + 指标不回退 + 性能基线。
7. **灰度**：线上小流量 A/B 对比 RAG 答案质量与 faithfulness，再全量。

### 7.3 资源需求

- 硬件：CPU（冒烟/CI）足够跑通；实训用 RTX 5060Ti 16G，base/large 模型 fp16 显存充裕。
- 软件：Python 3.10+、sentence-transformers、datasets、optimum[onnxruntime]、accelerate。
- 数据：领域样本对 5k–50k（下限 1k+）+ 评测集 200–500 query。
- 人力：数据标注/清洗是主要成本项。

### 7.4 预期成果

- 领域 Recall@10 提升至 0.85+，MRR/nDCG 同步提升。
- 下游 RAG "答非所问"显著下降，faithfulness 上升。
- 一套可复现的：评测集 + 微调脚本（CPU/GPU 双兼容）+ 导出验证流程。

### 7.5 风险与应对

| 风险 | 应对 |
|---|---|
| 数据泄漏致指标虚高 | train/eval 严格切分 + 近重去重 |
| 难负例噪声（假负例） | 阈值过滤 + 人工抽检 |
| 过拟合小领域、通用能力下降 | 早停 + 保留通用样本混训 + 通用集回归 |
| 量化精度损失 | 导出后余弦一致性 + 检索指标双验证，超阈值回退 fp16 |
| 显存不足（换大模型时） | 降 batch + 梯度累积 + fp16；必要时用 small 基座 |
| 线上回退风险 | 灰度 A/B + 一键回退旧向量索引 |

---

## 附：与本仓库教学边界的衔接

- 本方案已落地为独立 Python 线 `embedding-finetune/`，**不 import 任何 day**，符合仓库自包含原则。
- 落地代码分两条路径：CPU/CI 用纯标准库退化模型做真实对比学习冒烟（对齐 local-only 边界，
  `scripts/pipeline.py` / `scripts/run_tests.py` 无第三方依赖即可跑通并复现指标提升）；
  真实 GPU 训练与拉取大模型走 `scripts/real_finetune.py`，必须**显式手动执行**，不进默认 `npm test`。
- 评估侧与 `day59`（召回评估）、`day73`（faithfulness）的评测思路呼应，形成"检索工程 → 嵌入微调 → 忠实度校验"完整闭环。
