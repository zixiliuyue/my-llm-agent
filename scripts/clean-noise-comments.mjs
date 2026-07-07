#!/usr/bin/env node
/**
 * 套话注释清理脚本。
 *
 * 背景：仓库早期为了“逐行都有中文注释”，给几乎每一行都套了描述语法本身的注释
 * （如“定义常量：这个值只在当前作用域读取”“返回结果：调用方会拿到这个值”）。
 * 这类注释不含任何业务信息，只是把代码语法翻译一遍，属于噪音，违反“注释解释为什么”的原则。
 *
 * 清理策略（最保守）：
 *   1. 只处理独占整行的注释（该行去掉空白后以 `//` 开头）；
 *   2. 该注释内容必须【精确等于】固定套话清单里的某一条，才删除；
 *   3. 带业务信息的注释（如“定义常量：模拟 RAG 检索回来的证据片段”）因为不在固定清单里，天然保留；
 *   4. 文件顶部 JSDoc、函数块说明、行尾注释一律不动。
 * 归一化：比较前把中文逗号统一成英文逗号、折叠空白，兼容早期文件的标点差异。
 *
 * 用法：
 *   node scripts/clean-noise-comments.mjs --dry-run [目标目录...]   # 只统计不改文件
 *   node scripts/clean-noise-comments.mjs [目标目录...]             # 实际清理
 * 不传目标目录时默认处理仓库根下所有 day* 的 src 和 test。
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

// 固定套话清单：每一条都是“只描述语法、不含业务信息”的注释全文。
// 只有整行注释内容归一化后精确命中其中一条才会被删除。
const NOISE_PHRASES = [
  "这一行把当前文件需要用到的模块或函数拿进来。",
  "这个值只在当前作用域读取,不会被重新赋值。",
  "这个值后面会被更新,所以使用 let。",
  "根据当前状态选择不同分支,保证错误能尽早暴露。",
  "调用方会拿到这个值继续后续流程。",
  "把一段可复用逻辑命名,降低主流程阅读成本。",
  "这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。",
  "用于过程日志、错误或帮助信息,不污染 stdout。",
  "这里是命令的正式结果,方便脚本继续处理。",
  "用退出码告诉 shell 当前命令成功还是失败。",
  "让调用方知道当前流程不能继续。",
  "把可能失败的代码包起来,方便 catch 给出更清晰的错误。",
  "把异常转换成可理解的错误结果或退出码。",
  "按顺序处理多条数据或多个步骤。",
  "下一行代码依赖这个结果。",
  "里面会 await 异步操作,所以调用时也要等待结果。",
  "允许用户不改源码就切换模型地址、端口或运行模式。",
];

// 带标签前缀的套话：这些行形如「前缀：套话」，前缀本身也是纯语法描述。
// 同样要求“前缀 + 套话”整体精确命中，不误伤“前缀：业务说明”。
const LABELED_NOISE = [
  ["导入依赖", "这一行把当前文件需要用到的模块或函数拿进来。"],
  ["定义常量", "这个值只在当前作用域读取,不会被重新赋值。"],
  ["定义变量", "这个值后面会被更新,所以使用 let。"],
  ["条件判断", "根据当前状态选择不同分支,保证错误能尽早暴露。"],
  ["返回结果", "调用方会拿到这个值继续后续流程。"],
  ["普通函数", "把一段可复用逻辑命名,降低主流程阅读成本。"],
  ["导出函数", "这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。"],
  ["异步函数", "里面会 await 异步操作,所以调用时也要等待结果。"],
  ["输出到 stderr", "用于过程日志、错误或帮助信息,不污染 stdout。"],
  ["输出到 stdout", "这里是命令的正式结果,方便脚本继续处理。"],
  ["退出进程", "用退出码告诉 shell 当前命令成功还是失败。"],
  ["抛出错误", "让调用方知道当前流程不能继续。"],
  ["try 块", "把可能失败的代码包起来,方便 catch 给出更清晰的错误。"],
  ["catch 块", "把异常转换成可理解的错误结果或退出码。"],
  ["循环", "按顺序处理多条数据或多个步骤。"],
  ["等待异步操作完成", "下一行代码依赖这个结果。"],
  ["读取环境变量", "允许用户不改源码就切换模型地址、端口或运行模式。"],
];

// 把注释内容归一化：统一中文标点为英文、折叠空白，用于宽松但精确的相等比较。
function normalize(text) {
  return text
    .replace(/[，]/g, ",")
    .replace(/[。]/g, ".")
    .replace(/[：]/g, ":")
    .replace(/\s+/g, "")
    .trim();
}

// 预生成归一化后的套话集合，命中即删。
const NOISE_SET = new Set([
  ...NOISE_PHRASES.map(normalize),
  ...LABELED_NOISE.map(([label, phrase]) => normalize(`${label}:${phrase}`)),
]);

// 判断一整行是否为“应删除的独占套话注释行”。
function isNoiseLine(line) {
  // 条件：去掉前导空白后必须以 // 开头（独占注释行，不碰行尾注释）。
  const trimmed = line.trim();
  if (!trimmed.startsWith("//")) return false;
  // 取出 // 之后的注释正文，归一化后看是否精确命中套话集合。
  const body = trimmed.replace(/^\/\/\s*/, "");
  return NOISE_SET.has(normalize(body));
}

// 收集要处理的 .js 文件：默认取所有 day*/src 与 day*/test 下的 js。
function collectFiles(targets) {
  const files = [];
  // 递归遍历一个目录，收集 .js 文件。
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".js")) files.push(full);
    }
  };

  // 条件：显式指定了目标目录就只处理它们。
  if (targets.length > 0) {
    for (const t of targets) {
      const full = resolve(REPO_ROOT, t);
      if (statSync(full).isDirectory()) walk(full);
      else if (full.endsWith(".js")) files.push(full);
    }
    return files;
  }

  // 默认：扫描所有 day* 目录的 src 和 test。
  for (const entry of readdirSync(REPO_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^day\d{2}-/.test(entry.name)) continue;
    for (const sub of ["src", "test"]) {
      const dir = join(REPO_ROOT, entry.name, sub);
      try {
        if (statSync(dir).isDirectory()) walk(dir);
      } catch {
        // 该 day 没有这个子目录，跳过。
      }
    }
  }
  return files;
}

// 主流程。
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const targets = args.filter((a) => a !== "--dry-run");

  const files = collectFiles(targets);
  let totalRemoved = 0;
  let touchedFiles = 0;

  for (const file of files) {
    const original = readFileSync(file, "utf8");
    const lines = original.split("\n");
    // 过滤掉套话行，保留其余所有行。
    const kept = lines.filter((line) => !isNoiseLine(line));
    const removed = lines.length - kept.length;
    if (removed === 0) continue;

    totalRemoved += removed;
    touchedFiles += 1;
    // 非 dry-run 才真正写回；保持文件结尾换行习惯。
    if (!dryRun) {
      writeFileSync(file, kept.join("\n"), "utf8");
    }
  }

  console.error(`[clean-noise] ${dryRun ? "DRY-RUN " : ""}处理 ${files.length} 个文件，命中 ${touchedFiles} 个，删除 ${totalRemoved} 行套话注释`);
}

main();
