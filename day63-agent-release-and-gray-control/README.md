# Day 63 - Agent Release and Gray Control

## 概念

这一日补齐 prompt/model/tool/spec 版本管理、shadow run、canary eval、灰度比例、回滚和线上指标触发降级。

## 代码结构

- `src/index.js`：版本仓库、灰度路由、release plan、shadow compare、canary gate。
- `src/cli.js`：输出发布审计 JSON。
- `test/run.test.js`：覆盖灰度和回滚边界。

## 运行

```bash
# 用途：运行 day63 发布灰度 demo
# 执行目录：项目根目录
# 结果判断：evaluation.status=canary-passed，releaseNote 包含灰度比例
# 风险：只模拟版本和指标，不影响真实流量
npm run day63:start
```

## 实验

1. 把 `evalScore` 降到 `0.7`，观察回滚触发。
2. 调整 `grayPercent`，观察同一个用户稳定分流。
3. 改变 candidate toolPlan，观察 shadow compare 的差异。

## 复盘

- prompt、model、tool、spec 都要版本化，否则无法回放和回滚。
- 灰度比例和回滚条件应由配置和指标决定，不能由模型临场判断。
