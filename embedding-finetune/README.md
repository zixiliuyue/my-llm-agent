# emberft：从 0 到 1 微调嵌入模型（可运行实现）

本目录是 `docs/embedding-finetune-for-rag.md` 方案的**可运行落地**，把方案里
"对比学习微调嵌入模型根治 RAG 答非所问"这一命题变成能跑、能测、能复现的代码。

## 为什么是独立 Python 线

仓库主体是 Node.js 教学平台，与嵌入相关的三处（day03/day59/day73）都是 mock，
无真实学习型向量。真实微调需要 Python ML 生态，因此按方案设计成**不 import 任何 day**
的独立目录，符合仓库自包含原则。

## 两条路径（对应方案"双环境策略"）

| 路径 | 依赖 | 用途 | 入口 |
|---|---|---|---|
| **默认可跑路径** | 仅 Python 3.10+ 标准库 | CPU/CI 冒烟：真实训练循环+评估+导出验证全跑通 | `scripts/pipeline.py` 等 |
| **真实 GPU 实训线** | sentence-transformers/torch/optimum | RTX 5060Ti 16G 拉真实 BGE 基座微调+ONNX 导出 | `scripts/real_finetune.py` |

默认路径用**纯标准库**实现了一个退化但完整的嵌入模型（线性投影 + 特征哈希），
它有**真实可训练参数、真实手写 InfoNCE 梯度、真实检索指标**，因此能定量证明
"微调后 Recall/MRR/nDCG 显著优于 baseline"——这是方案的核心结论。
真实 GPU 训练遵循仓库 local-only 边界，必须手动 `pip install -r requirements.txt` 后显式运行，
**不进默认测试**。

## 代码结构

```
embedding-finetune/
├── data/                     领域数据集（运维/发布/RAG/权限主题）
│   ├── train_pairs.jsonl     训练对：query / positive / hard_negatives
│   ├── eval_corpus.jsonl     评测语料：doc_id / text
│   └── eval_qrels.jsonl      评测标注：qid / query / relevant[]
├── src/emberft/
│   ├── linalg.py             向量运算（点积/范数/归一化/softmax，无 numpy）
│   ├── features.py           文本→稀疏词频特征（字级+bigram+特征哈希，确定性）
│   ├── model.py              可学习线性投影嵌入 + query/passage 前缀（非对称检索）
│   ├── contrastive.py        InfoNCE + 批内负例 + 难负例，手写梯度训练循环
│   ├── dataset.py            清洗/长度过滤/MinHash 去重/泄漏检测/平衡/难负例挖掘
│   ├── metrics.py            Recall@K / MRR@K / nDCG@K
│   ├── retriever.py          最近邻检索
│   └── export_check.py       fp32/INT8 导出 + 数值一致性校验(余弦>0.999)
├── scripts/
│   ├── pipeline.py           端到端：baseline→数据工程→微调→评估→导出验证
│   ├── train.py              单独训练并保存模型
│   ├── evaluate.py           baseline vs finetuned 指标对比
│   ├── export_verify.py      导出 fp32/INT8 一致性 + 检索回归
│   ├── real_finetune.py      真实 GPU 实训线（需显式装依赖）
│   └── run_tests.py          统一测试入口
└── tests/                    28 个 unittest，覆盖各模块
```

## 运行

```bash
# 执行目录：embedding-finetune/
# 用途：跑通四阶段端到端流水线，打印 baseline/finetuned 指标对比与导出报告
# 结果判断：末尾打印 "总判定: PASS ✓"，退出码 0
# 风险：纯本地 CPU，无网络、无第三方依赖
python3 scripts/pipeline.py

# CPU 冒烟（更快，验证链路可跑通）
EMB_EPOCHS=3 EMB_BATCH=4 python3 scripts/pipeline.py

# 单元测试
python3 scripts/run_tests.py     # 末尾打印 all embedding-finetune tests passed
```

真实 GPU 实训（**手动执行，勿进 CI**）：

```bash
pip install -r requirements.txt   # 另需按显卡装对应 torch
# RTX 5060Ti 16G 实训
EMB_BASE=BAAI/bge-base-zh-v1.5 EMB_BATCH=32 EMB_EPOCHS=3 EMB_FP16=1 \
    python3 scripts/real_finetune.py
```

## 实测结果（默认流水线）

| 指标 | baseline（未微调基座） | finetuned（对比学习后） |
|---|---|---|
| Recall@10 | 0.80 | **1.00** |
| MRR@10 | 0.50 | **0.81** |
| nDCG@10 | 0.57 | **0.86** |

导出验证：fp32 余弦一致性 = 1.000000（无损）；INT8 量化最小余弦 > 0.9999、
检索指标零回退。训练 loss 从 3.78 单调降到 0.05，nDCG 在 epoch 6 进入平台期（早停点）。

> 数值随语料确定性可复现（哈希用 md5、洗牌用 LCG、初始化用种子高斯），
> 同机器多次运行结果一致，因此 baseline 与 finetuned 的对比是公平的。

## 复盘：这套实现讲清了方案的哪些考点

- **为何用对比学习**：`contrastive.py` 手写 InfoNCE，拉近 query-正例、推远难负例，梯度可见。
- **难负例为何关键 / 怎么挖**：`dataset.mine_hard_negatives` 用基座检索高相似非正确段落，并过滤假负例。
- **数据泄漏怎么防**：`dataset.detect_leakage` 用 MinHash 近重检出 train/eval 重叠。
- **batch 为何影响对比学习**：批内所有正例+难负例进候选池，batch 越大负例越多、信号越强。
- **query/doc 不对称**：`model.encode` 按 query/passage 加不同 instruction 前缀。
- **导出为何要校验一致性**：`export_check` 复刻余弦>0.999 与 INT8 量化误差评估。
- **答非所问先看哪**：`metrics` 先看 Recall@K 定位召回问题，再谈生成/忠实度。
