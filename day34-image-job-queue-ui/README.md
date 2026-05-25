# Day 34：图片任务队列 UI

## 概念

本地文生图和图生图通常很慢，UI 不能假设请求会立即完成。Day34 用队列状态机表达 `queued`、`running`、`done`、`error`、`cancelled`，让后续 ComfyUI 任务可以被稳定展示。

## 代码结构

- `src/index.js`：图片任务创建、状态转移、队列 reducer 和统计。
- `src/build.js`：生成一个静态 `dist/index.html` 队列页面。
- `src/cli.js`：输出 demo 队列 JSON。
- `test/run.test.js`：覆盖状态机和统计。

## 运行

```bash
# 用途：运行队列状态 demo
# 执行目录：<项目根目录>/day34-image-job-queue-ui
# 结果判断：输出 queued/running 任务和 summary
# 风险：只读，不调用 ComfyUI
npm run demo
```

```bash
# 用途：构建本地静态队列页面
# 执行目录：<项目根目录>/day34-image-job-queue-ui
# 结果判断：生成 dist/index.html
# 风险：只写入本 day 的 dist 目录，dist 不提交
npm run build
```

PowerShell：

```powershell
# 用途：在 Windows 10 上构建同一个静态页面
# 执行目录：<项目根目录>\day34-image-job-queue-ui
# 结果判断：dist\index.html 存在
# 风险：只写入本 day 的 dist 目录
npm run build
```

## 实验

后续可以把队列的 `done.output` 接到 day33 的 ComfyUI `/view` 图片 URL，但状态机本身不依赖真实模型。

## 复盘

长耗时任务要先建模状态，再接真实后端。这样 Mac mock、Windows GPU 实跑时用的是同一套 UI 逻辑。
