#!/usr/bin/env node
/**
 * Day 30 Web 构建脚本。
 *
 * 这里不用 Vite，是为了让当天示例完全自包含、零依赖。
 * 构建结果写入 dist/index.html，dist 已在根 .gitignore 中排除。
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runDemo } from './index.js';

/** 根据 mock demo 结果生成一个最小可读的 HTML 页面。 */
function renderHtml(result) {
  const items = result.events.map((event) => '<li><strong>' + event.name + '</strong><span>' + event.status + '</span></li>').join('');
  return '<!doctype html>' +
    '<html lang="zh-CN"><head><meta charset="utf-8" />' +
    '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
    '<title>Day 30 mini-openclaw Integrated</title>' +
    '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;background:#f6f8f7;color:#17202a}main{max-width:860px;margin:0 auto;padding:32px}section{background:#fff;border:1px solid #d9e2dd;border-radius:8px;padding:24px}h1{margin:0 0 8px;font-size:24px}p{color:#5b6b65;line-height:1.6}ul{padding:0;list-style:none;display:grid;gap:10px}li{display:flex;justify-content:space-between;border:1px solid #e6ece8;border-radius:8px;padding:12px;background:#fbfdfc}</style>' +
    '</head><body><main><section>' +
    '<h1>Day 30：mini-openclaw Integrated</h1>' +
    '<p>这是自包含 Web mock 页面，用于观察当天 mini-openclaw 能力点。</p>' +
    '<ul>' + items + '</ul>' +
    '</section></main></body></html>';
}

const result = runDemo();
const distDir = resolve('dist');
await mkdir(distDir, { recursive: true });
await writeFile(resolve(distDir, 'index.html'), renderHtml(result));
console.error('built dist/index.html');
