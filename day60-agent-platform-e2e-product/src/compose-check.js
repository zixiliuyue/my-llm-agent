#!/usr/bin/env node
/**
 * Day 60 Docker Compose 显式演示检查。
 *
 * 默认测试不启动 Docker；这个命令只判断本机是否具备 compose 能力，并给出下一步命令。
 */
import { spawnSync } from "node:child_process";

const result = spawnSync("docker", ["compose", "version"], { encoding: "utf8" });
if (result.status === 0) {
  console.log(JSON.stringify({
    ok: true,
    dockerCompose: result.stdout.trim(),
    next: "docker compose up --build",
  }, null, 2));
} else {
  console.log(JSON.stringify({
    ok: false,
    reason: "未检测到 docker compose；默认 npm test 不依赖 Docker",
    hint: "安装 Docker Desktop 后在 day60-agent-platform-e2e-product 目录执行 docker compose up --build",
  }, null, 2));
}
