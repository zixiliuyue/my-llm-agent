#!/usr/bin/env node
/**
 * day 结构一致性校验。
 *
 * 存在意义：AGENTS.md 第 4 节规定了每个 day 的结构规范（package.json + src + test + README、
 * 必需的 npm scripts、README 五段、test 末尾打印 dayXX tests passed）。这些规范原来只靠人肉遵守，
 * 76 个 day 很容易在新增时漏项。这个脚本把口头规范变成可执行门禁，接入 CI 后能自动挡住不合规的新 day。
 *
 * 校验分两级：
 *   - error（致命）：缺核心文件或必需 scripts，会让脚本非 0 退出，阻断 CI。
 *   - warn（提醒）：README 未含五段标准段落等风格问题，只提示不阻断，
 *     因为 day01 等早期入门页用的是更详细的自定义结构，属于合理差异。
 *
 * 边界：只做静态文件/文本检查，不执行任何 day 代码，不访问网络。
 */
// 导入依赖：读取目录和文件、判断存在性。
import { readdirSync, existsSync, readFileSync } from "node:fs";
// 导入依赖：拼路径。
import { dirname, join, resolve } from "node:path";
// 导入依赖：定位脚本所在目录。
import { fileURLToPath } from "node:url";

// 定义常量：脚本所在目录。
const __dirname = dirname(fileURLToPath(import.meta.url));
// 定义常量：仓库根目录。
const REPO_ROOT = resolve(__dirname, "..");

// 定义常量：README 建议包含的五段标准标题（教学模板）。缺失只告警不报错。
const RECOMMENDED_SECTIONS = ["概念", "代码结构", "运行", "实验", "复盘"];
// 定义常量：每个 day 必需的 npm scripts，缺失视为致命错误。
const REQUIRED_SCRIPTS = ["start", "test"];

/** 发现所有 dayNN-* 目录，按编号升序。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function discoverDays() {
  // 返回结果：过滤合法 day 目录并排序。
  return readdirSync(REPO_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^day\d{2}-/.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => Number(a.slice(3, 5)) - Number(b.slice(3, 5)));
}

/**
 * 校验单个 day 的结构，返回 { errors, warnings } 两个数组。
 * errors 非空表示该 day 违反硬边界；warnings 只是风格提醒。
 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function checkDay(day) {
  // 定义常量：该 day 的绝对目录。
  const dir = join(REPO_ROOT, day);
  // 定义常量：致命问题收集。
  const errors = [];
  // 定义常量：提醒问题收集。
  const warnings = [];

  // 条件判断：必须有 package.json，这是 day 可运行的前提。
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) {
    errors.push("缺少 package.json");
  } else {
    // try 块：package.json 可能格式损坏，解析失败也算致命错误。
    try {
      // 定义常量：解析 package.json，检查必需 scripts。
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      // 定义常量：该 day 声明的 scripts（可能为空对象）。
      const scripts = pkg.scripts || {};
      // 循环：逐个检查必需脚本是否声明。
      for (const name of REQUIRED_SCRIPTS) {
        if (!scripts[name]) {
          errors.push(`package.json 缺少 scripts.${name}`);
        }
      }
    } catch (error) {
      // 记录：JSON 解析失败。
      errors.push(`package.json 解析失败: ${error.message}`);
    }
  }

  // 条件判断：必须有 src 目录。
  if (!existsSync(join(dir, "src"))) {
    errors.push("缺少 src/ 目录");
  }

  // 条件判断：必须有 test 目录，且目录内至少有一个 .test.js 或 run 测试文件。
  const testDir = join(dir, "test");
  if (!existsSync(testDir)) {
    errors.push("缺少 test/ 目录");
  } else {
    // 定义常量：test 目录下的所有文件。
    const testFiles = readdirSync(testDir).filter((f) => f.endsWith(".js"));
    // 条件判断：没有任何测试文件视为致命。
    if (testFiles.length === 0) {
      errors.push("test/ 目录下没有 .js 测试文件");
    } else {
      // 定义常量：检查是否有测试文件包含成功标记（AGENTS 约定的 dayXX tests passed）。
      const hasPassedMarker = testFiles.some((f) => readFileSync(join(testDir, f), "utf8").includes("tests passed"));
      // 条件判断：缺成功标记只告警，因为个别 day 可能用别的断言风格。
      if (!hasPassedMarker) {
        warnings.push("test 未打印 'tests passed' 成功标记");
      }
    }
  }

  // 条件判断：必须有 README.md。
  const readmePath = join(dir, "README.md");
  if (!existsSync(readmePath)) {
    errors.push("缺少 README.md");
  } else {
    // 定义常量：README 全文，用于检查推荐段落。
    const readme = readFileSync(readmePath, "utf8");
    // 定义常量：缺失的推荐段落。
    const missing = RECOMMENDED_SECTIONS.filter((section) => !readme.includes(section));
    // 条件判断：缺推荐段落只告警，早期入门页用自定义结构属合理差异。
    if (missing.length > 0) {
      warnings.push(`README 未包含推荐段落: ${missing.join("、")}`);
    }
  }

  // 返回结果：调用方据此汇总和决定退出码。
  return { errors, warnings };
}

/** 主流程：逐个 day 校验 -> 汇总 -> 有 error 则非 0 退出。 */
// 普通函数：把一段可复用逻辑命名，降低主流程阅读成本。
function main() {
  // 定义常量：所有 day。
  const days = discoverDays();
  // 定义变量：累计致命错误数量，决定最终退出码。
  let errorCount = 0;
  // 定义变量：累计告警数量，仅用于汇总展示。
  let warnCount = 0;

  // 循环：逐个 day 校验并即时打印问题。
  for (const day of days) {
    // 定义常量：该 day 的校验结果。
    const { errors, warnings } = checkDay(day);
    // 条件判断：有问题才打印，保持输出聚焦。
    if (errors.length > 0 || warnings.length > 0) {
      console.error(`\n[check-structure] ${day}`);
      // 循环：打印致命错误。
      for (const e of errors) {
        console.error(`  ✗ ERROR: ${e}`);
        errorCount += 1;
      }
      // 循环：打印告警。
      for (const w of warnings) {
        console.error(`  ! WARN:  ${w}`);
        warnCount += 1;
      }
    }
  }

  // 输出到 stderr：总览。
  console.error(`\n[check-structure] ===== 汇总 =====`);
  console.error(`[check-structure] 检查 ${days.length} 个 day，error ${errorCount} 个，warn ${warnCount} 个`);
  // 条件判断：有致命错误才非 0 退出，阻断 CI。
  if (errorCount > 0) {
    // 退出进程：让 CI 知道结构校验失败。
    process.exit(1);
  }
  // 输出到 stdout：无致命错误时给可被 grep 的成功标记。
  console.log("structure check passed");
}

// 启动主流程。
main();
