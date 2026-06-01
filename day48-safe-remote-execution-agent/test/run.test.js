/**
 * Day 48：自包含学习源码。
 *
 * 这个文件属于 day48-safe-remote-execution-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证高危命令直接阻断，服务生命周期命令进入审批，读日志只生成 dry-run。
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { buildRemoteExecutionPlan, classifyCommandRisk } from "../src/index.js";

// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(classifyCommandRisk("rm -rf /").status, "blocked");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(classifyCommandRisk("journalctl -u gpmm_backend -n 100").status, "dry-run-ready");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(classifyCommandRisk("systemctl restart gpmm_backend").status, "pending-approval");

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const plan = buildRemoteExecutionPlan({ command: "supervisorctl restart owl-health", target: "sit-health-01" });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(plan.dryRun, true);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(plan.approvalRequired, true);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.ok(plan.rollback.length >= 3);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(plan.audit.executed, false);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const blocked = buildRemoteExecutionPlan({ command: "drop database prod" });
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(blocked.status, "blocked");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(blocked.approvalRequired, false);

// 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day48 tests passed");
