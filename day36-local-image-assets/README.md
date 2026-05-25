# Day 36：本地图片资产元数据

## 概念

图片生成实验要能复盘：哪条 prompt、哪个 workflow、哪个模型、seed 是什么、输出文件在哪里。Day36 建立本地 JSONL 资产记录，不把云 URL 或远程资源混入学习项目。

## 代码结构

- `src/index.js`：本地路径校验、图片资产记录、JSONL 序列化和模型过滤。
- `src/cli.js`：输出一个资产记录 demo。
- `test/run.test.js`：覆盖本地路径、远程 URL 拒绝和 JSONL 往返。

## 运行

```bash
# 用途：生成一条本地图片资产记录示例
# 执行目录：<项目根目录>/day36-local-image-assets
# 结果判断：输出 records 和 jsonl
# 风险：只输出 JSON，不写入图片文件
npm run demo
```

PowerShell：

```powershell
# 用途：在 Windows 10 上查看同样的资产元数据结构
# 执行目录：<项目根目录>\day36-local-image-assets
# 结果判断：localOnly 为 true
# 风险：只读，不扫描磁盘
npm run demo
```

## 实验

真实生成图片后，把 `outputs/*.png`、prompt、seed、workflow 和模型名写入 JSONL。这样 Mac mock 和 Windows GPU 实跑能共享同一种资产索引。

## 复盘

资产管理先从元数据开始，先保证可追踪，再考虑缩略图、标签和搜索。
