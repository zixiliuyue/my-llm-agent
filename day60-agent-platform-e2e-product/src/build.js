#!/usr/bin/env node
/**
 * Day 60 前端构建脚本。
 *
 * 生成一个无依赖的静态 Agent Ops Console，用于面试展示 run 列表、timeline、tool call、
 * approval、RAG citation、eval report 和 incident final report。
 */
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { mkdirSync, writeFileSync } from "node:fs";
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { resolve } from "node:path";
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { runProductDemo } from "./index.js";

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const demo = runProductDemo();
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const outDir = resolve("dist");
mkdirSync(outDir, { recursive: true });

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Agent Ops Console</title>
  <style>
    :root { color-scheme: light; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172026; background: #f6f8fb; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    header { padding: 18px 28px; background: #ffffff; border-bottom: 1px solid #dde4ee; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    h1 { margin: 0; font-size: 22px; line-height: 1.2; letter-spacing: 0; }
    h2 { margin: 0 0 10px; font-size: 15px; letter-spacing: 0; }
    main { padding: 20px 28px 28px; display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 18px; }
    button { border: 1px solid #b7c4d4; background: #fff; min-height: 34px; border-radius: 6px; padding: 0 12px; color: #172026; cursor: pointer; }
    .status { padding: 6px 10px; border-radius: 999px; background: #e8f4ee; color: #146c43; font-size: 13px; white-space: nowrap; }
    .panel { background: #fff; border: 1px solid #dde4ee; border-radius: 8px; padding: 14px; }
    .stack { display: grid; gap: 12px; }
    .run { width: 100%; text-align: left; border-color: #d3dce8; background: #f9fbfd; min-height: 64px; }
    .run strong { display: block; margin-bottom: 4px; font-size: 14px; }
    .meta { color: #5d6b7b; font-size: 12px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .timeline { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    .timeline li { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 10px; padding: 8px 0; border-bottom: 1px solid #edf1f6; }
    code, pre { font-family: "SFMono-Regular", Consolas, monospace; }
    pre { margin: 0; padding: 10px; background: #f4f6f8; border-radius: 6px; overflow: auto; }
    @media (max-width: 860px) { main { grid-template-columns: 1fr; padding: 16px; } header { padding: 16px; align-items: flex-start; flex-direction: column; } .grid { grid-template-columns: 1fr; } .timeline li { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Agent Ops Console</h1>
      <div class="meta">Run timeline, tool approval, RAG citation, eval report, incident report</div>
    </div>
    <span class="status">${demo.selectedRun.status}</span>
  </header>
  <main>
    <aside class="panel stack">
      <h2>Runs</h2>
      ${demo.runs.map((run) => `<button class="run"><strong>${run.id}</strong><span class="meta">${run.status} · tools ${run.toolCalls} · citations ${run.citations}</span></button>`).join("")}
    </aside>
    <section class="stack">
      <div class="grid">
        <div class="panel">
          <h2>Timeline</h2>
          <ul class="timeline">${demo.selectedRun.timeline.map((item) => `<li><span class="meta">${item.type}</span><span>${item.message}</span></li>`).join("")}</ul>
        </div>
        <div class="panel">
          <h2>Tool Call / Approval</h2>
          <pre>${JSON.stringify(demo.selectedRun.toolCalls, null, 2)}</pre>
        </div>
        <div class="panel">
          <h2>RAG Citations</h2>
          <pre>${JSON.stringify(demo.selectedRun.citations, null, 2)}</pre>
        </div>
        <div class="panel">
          <h2>Evidence Board</h2>
          <pre>${JSON.stringify(demo.selectedRun.evidenceBoard, null, 2)}</pre>
        </div>
        <div class="panel">
          <h2>Eval Report</h2>
          <pre>${JSON.stringify({ grounded: true, approvalRequired: true, replayable: true }, null, 2)}</pre>
        </div>
        <div class="panel">
          <h2>Incident Final Report</h2>
          <pre>${JSON.stringify(demo.finalReport, null, 2)}</pre>
        </div>
      </div>
    </section>
  </main>
</body>
</html>`;

writeFileSync(resolve(outDir, "index.html"), html);
// 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log(JSON.stringify({ ok: true, file: "dist/index.html", bytes: html.length }, null, 2));
