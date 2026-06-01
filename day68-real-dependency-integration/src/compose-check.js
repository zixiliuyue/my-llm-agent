#!/usr/bin/env node
/**
 * Day 68：Docker Compose 可用性检查。
 */
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { spawnSync } from "node:child_process";

// 启动子进程：这里只做只读检查，不启动 Docker 服务。
const result = spawnSync("docker", ["compose", "version"], { encoding: "utf8" });
// 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
if (result.status === 0) {
  // 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
  console.log(JSON.stringify({ ok: true, version: result.stdout.trim(), next: "cd day68-real-dependency-integration && docker compose up --build" }, null, 2));
} else {
  // 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
  console.log(JSON.stringify({ ok: false, reason: "未检测到 docker compose；默认测试仍使用计划和 mock health check", error: (result.stderr || result.error?.message || "").trim().split("\n")[0] }, null, 2));
}
