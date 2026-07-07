#!/usr/bin/env node
/**
 * 遍历式测试 runner。
 *
 * 学习目标 / 存在意义：
 * 原来根 package.json 的 `test` 是 75 个 `npm run dayXX:test && ...` 串起来的超长链。
 * 串行链有两个痛点：
 *   1. 首个 day 失败就中断，后面所有 day 都不执行，看不到全局失败面；
 *   2. 每新增一个 day 都要手改这条超长字符串（AGENTS.md 里还有两条同样的命令串），极易漏改。
 * 这个脚本改为“扫描 day* 目录，逐个跑各自的 test，最后汇总 passed/failed 再决定退出码”，
 * 新增 day 零配置接入，且一次能看到全部失败项。
 *
 * 边界：只跑各 day 自包含的单元测试（不依赖真实模型），不访问 Ollama、不部署、不执行远程命令。
 * 与 run-all-examples.mjs 分工：那个跑 start 示例 + web build + 真实 API smoke，这个只跑纯单测。
 */
// 导入依赖：spawnSync 同步执行子进程，逐个 day 串行跑但不因失败中断整体。
import { spawnSync } from "node:child_process";
// 导入依赖：读取目录用于扫描所有 day 子项目，判断文件是否存在用于过滤。
import { readdirSync, existsSync } from "node:fs";
// 导入依赖：拼路径，定位仓库根和各 day 目录。
import { dirname, join, resolve } from "node:path";
// 导入依赖：把当前模块的 URL 转成文件路径，得到脚本所在目录。
import { fileURLToPath } from "node:url";

// 定义常量：脚本所在目录。
const __dirname = dirname(fileURLToPath(import.meta.url));
// 定义常量：仓库根目录（脚本在 scripts/ 下，上一级即根）。
const REPO_ROOT = resolve(__dirname, "..");
// Windows 下 npm 可执行文件是 npm.cmd，直接 spawn npm 会找不到入口。
const NPM_COMMAND = process.platform === "win32" ? "npm.cmd" : "npm";

/**
 * 已知未就绪清单：这些 day 目录存在，但测试当前无法通过，且原因已明确记录在案。
 * 把它们隔离成 WARN 而不是致命失败，避免一个未就绪目录挡住整库回归；
 * 但仍然在汇总里显式列出，符合“失败显性化”——不假装它通过，也不悄悄跳过。
 *
 * day01-single-agent-cds：未注册进根 package.json 的孤儿实验变体，
 *   其 runAgent 循环解析成功后直接 break，从不执行 tool、从不 return answer（隐式返回 undefined），
 *   且 system prompt 是“日志解析引擎”与计算器测试不匹配。属于半成品，需要重写 agent loop 才能通过。
 */
const KNOWN_UNREADY = new Map([
  ["day01-single-agent-cds", "未注册孤儿变体，runAgent 缺少 tool 执行与 return，需重写 agent loop"],
]);

/**
 * 扫描仓库根下所有 dayNN-* 目录，返回按 day 编号升序排列的目录名。
 * 只认既有 package.json、又有 test 目录的 day，避免把半成品目录算进来。
 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function discoverDays() {
  // 定义常量：读取根目录所有条目。
  const entries = readdirSync(REPO_ROOT, { withFileTypes: true });
  // 返回结果：过滤出合法 day 目录并按编号排序。
  return entries
    // 条件过滤：只要名字形如 dayNN-xxx 的子目录。
    .filter((entry) => entry.isDirectory() && /^day\d{2}-/.test(entry.name))
    // 条件过滤：必须同时有 package.json 和 test 目录，才是一个可测的 day。
    .filter((entry) => existsSync(join(REPO_ROOT, entry.name, "package.json")) && existsSync(join(REPO_ROOT, entry.name, "test")))
    .map((entry) => entry.name)
    // 排序：按目录名里的 day 编号升序，保证输出顺序稳定、可读。
    .sort((a, b) => Number(a.slice(3, 5)) - Number(b.slice(3, 5)));
}

/**
 * 跑单个 day 的 test 脚本，返回是否通过和耗时。
 * 用 `npm --prefix <day> test`，与 AGENTS.md 里记录的单 day 验证命令保持一致。
 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function runDayTest(day) {
  // 定义常量：记录开始时间，用于统计单 day 耗时。
  const startedAt = Date.now();
  // 定义常量：同步执行该 day 的 npm test；stdio 继承，实时透传测试输出。
  const result = spawnSync(NPM_COMMAND, ["--prefix", join(REPO_ROOT, day), "test"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    // 关闭颜色，保证 CI 日志干净可读。
    env: { ...process.env, NO_COLOR: process.env.NO_COLOR || "1" },
  });
  // 返回结果：status 为 0 视为通过；带上耗时便于发现异常慢的 day。
  return { day, ok: result.status === 0, ms: Date.now() - startedAt };
}

/** 主流程：发现所有 day -> 逐个跑 -> 汇总 -> 用退出码反映整体结果。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function main() {
  // 定义常量：发现所有可测 day。
  const days = discoverDays();
  // 定义常量：把已知未就绪的 day 从待跑列表里分出来，单独按 WARN 处理。
  const runnable = days.filter((day) => !KNOWN_UNREADY.has(day));
  const skipped = days.filter((day) => KNOWN_UNREADY.has(day));
  // 输出到 stderr：过程日志放 stderr，不污染最终结论。
  console.error(`[run-all-tests] 发现 ${days.length} 个 day，其中 ${runnable.length} 个待运行、${skipped.length} 个已知未就绪...`);

  // 定义常量：收集每个 day 的结果，不因单个失败而中断。
  const results = [];
  // 循环：逐个 day 跑测试。即使某个失败也继续，最后统一汇总。
  for (const day of runnable) {
    results.push(runDayTest(day));
  }

  // 定义常量：失败的 day 列表，用于汇总和退出码判断。
  const failed = results.filter((r) => !r.ok);
  // 定义常量：通过数量。
  const passed = results.length - failed.length;

  // 输出到 stderr：打印一行总览，一眼看到 X/Y 通过。
  console.error("\n[run-all-tests] ===== 汇总 =====");
  console.error(`[run-all-tests] 通过 ${passed}/${results.length}`);
  // 条件判断：显式列出被隔离的已知未就绪 day 及原因，避免“悄悄跳过”。
  if (skipped.length > 0) {
    console.error(`[run-all-tests] WARN 已隔离 ${skipped.length} 个已知未就绪 day（不计入失败）:`);
    for (const day of skipped) {
      console.error(`  - ${day}: ${KNOWN_UNREADY.get(day)}`);
    }
  }
  // 条件判断：有失败就逐条列出，方便一次性定位全部问题（而不是只看到第一个）。
  if (failed.length > 0) {
    console.error(`[run-all-tests] 失败的 day:`);
    for (const item of failed) {
      console.error(`  - ${item.day}`);
    }
    // 退出进程：非 0 退出码让 CI 和 shell 知道整体失败。
    process.exit(1);
  }
  // 输出到 stdout：全部通过时给一个明确、可被脚本 grep 的成功标记。
  console.log("all day tests passed");
}

// 启动主流程。
main();
