#!/usr/bin/env node
/**
 * Day 57：自包含学习源码。
 *
 * 这个文件属于 day57-production-agent-runtime，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：给出 Docker Compose 演示入口；默认只检查命令，不强制启动真实服务。
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { spawnSync } from "node:child_process";

// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const composeFile = new URL("../docker-compose.yml", import.meta.url).pathname;

// 教学：启动子进程：这里只做只读检查，不启动 Docker 服务。
const result = spawnSync("docker", ["compose", "version"], { encoding: "utf8" });

// 教学：条件判断：根据当前状态选择不同分支，保证错误能尽早暴露。
if (result.status === 0) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const version = result.stdout.trim();
  // 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
  console.log(JSON.stringify({
    ok: true,
    docker: version,
    composeFile,
    run: `docker compose -f ${composeFile} up --build`,
    note: "默认测试不启动 Docker；面试演示时执行 run 字段里的命令。"
  }, null, 2));
} else {
  // 教学：输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
  console.log(JSON.stringify({
    ok: false,
    composeFile,
    run: `docker compose -f ${composeFile} up --build`,
    note: "当前机器未检测到 docker compose；默认单元测试仍可运行。",
    error: (result.stderr || result.stdout || result.error?.message || "docker compose unavailable").trim().split("\n")[0]
  }, null, 2));
}
