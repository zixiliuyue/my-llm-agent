#!/usr/bin/env node
/**
 * Day 60 Docker Compose 显式演示检查。
 *
 * 默认测试不启动 Docker；这个命令只判断本机是否具备 compose 能力，并给出下一步命令。
 */
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { spawnSync } from "node:child_process";

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const result = spawnSync("docker", ["compose", "version"], { encoding: "utf8" });
// 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
if (result.status === 0) {
  // 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
  console.log(JSON.stringify({
    ok: true,
    dockerCompose: result.stdout.trim(),
    next: "docker compose up --build",
  }, null, 2));
// 条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
} else {
  // 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
  console.log(JSON.stringify({
    ok: false,
    reason: "未检测到 docker compose；默认 npm test 不依赖 Docker",
    hint: "安装 Docker Desktop 后在 day60-agent-platform-e2e-product 目录执行 docker compose up --build",
  }, null, 2));
}
