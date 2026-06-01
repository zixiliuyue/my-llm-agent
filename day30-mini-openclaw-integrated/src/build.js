#!/usr/bin/env node
/**
 * Day 30：自包含学习源码。
 *
 * 这个文件属于 day30-mini-openclaw-integrated，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
/**
 * Day 30 build 脚本。
 *
 * build.js 是 Web day 的静态页面构建脚本：它把 runDemo 的结果写成 dist/index.html。
 * 这里只生成本地静态产物，不启动服务、不访问模型、不部署远程环境。
 */
/**
 * Day 30 Web 构建脚本。
 *
 * 这里不用 Vite，是为了让当天示例完全自包含、零依赖。
 * 构建结果写入 dist/index.html，dist 已在根 .gitignore 中排除。
 */
// mkdir/writeFile 是异步文件 API，用来创建 dist 目录并写入 HTML 文件。
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { mkdir, writeFile } from 'node:fs/promises';
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { resolve } from 'node:path';
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { runDemo } from './index.js';

/** 根据 mock demo 结果生成一个最小可读的 HTML 页面。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function renderHtml(result) {
  // 定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const items = result.events.map((event) => '<li><strong>' + event.name + '</strong><span>' + event.status + '</span></li>').join('');
  // 返回结果：调用方会拿到这个值继续后续流程。
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

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const result = runDemo();
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const distDir = resolve('dist');
// recursive=true 表示 dist 不存在就创建，存在也不报错。
// 等待异步操作完成：下一行代码依赖这个结果。
await mkdir(distDir, { recursive: true });
// 把完整 HTML 写入 dist/index.html，浏览器可直接打开查看。
// 等待异步操作完成：下一行代码依赖这个结果。
await writeFile(resolve(distDir, 'index.html'), renderHtml(result));
// 输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
console.error('built dist/index.html');
