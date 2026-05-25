#!/usr/bin/env node
/**
 * Day 34：自包含学习源码。
 *
 * 这个文件属于 day34-image-job-queue-ui，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：生成一个无需前端框架也能打开的本地队列 UI。
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import fs from "node:fs";
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import path from "node:path";
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createDemoQueue, summarizeQueue } from "./index.js";

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const distDir = path.resolve("dist");
fs.mkdirSync(distDir, { recursive: true });

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const queue = createDemoQueue();
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const summary = summarizeQueue(queue);
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const rows = queue
  .map(
    (job) => `<tr>
      <td>${job.id}</td>
      <td>${job.status}</td>
      <td>${job.progress}%</td>
      <td>${job.provider}</td>
      <td>${job.prompt}</td>
    </tr>`
  )
  .join("\n");

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Day34 图片任务队列</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f7f7f4; color: #202124; }
    main { max-width: 960px; margin: 0 auto; padding: 32px 20px; }
    h1 { font-size: 28px; margin: 0 0 16px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 18px; }
    .stat { border: 1px solid #d7d7d0; border-radius: 8px; padding: 12px; background: #fff; }
    .stat strong { display: block; font-size: 24px; }
    table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #d7d7d0; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #ecece7; vertical-align: top; }
    th { font-size: 13px; color: #555; background: #fafaf7; }
    td { font-size: 14px; }
  </style>
</head>
<body>
  <main>
    <h1>Day34 图片任务队列</h1>
    <section class="stats" aria-label="队列统计">
      <div class="stat"><span>总数</span><strong>${summary.total}</strong></div>
      <div class="stat"><span>排队</span><strong>${summary.queued}</strong></div>
      <div class="stat"><span>运行</span><strong>${summary.running}</strong></div>
      <div class="stat"><span>完成</span><strong>${summary.done}</strong></div>
    </section>
    <table>
      <thead><tr><th>ID</th><th>状态</th><th>进度</th><th>Provider</th><th>Prompt</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </main>
</body>
</html>`;

fs.writeFileSync(path.join(distDir, "index.html"), html);
// 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log(`built ${path.join(distDir, "index.html")}`);
