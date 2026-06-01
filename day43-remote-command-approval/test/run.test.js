/**
 * Day 43：自包含学习源码。
 *
 * 这个文件属于 day43-remote-command-approval，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证高危命令会被阻断，服务操作需要审批，demo 不执行真实命令。
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import assert from "node:assert/strict";
// 导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { classifyCommandRisk, createRemoteCommandPlan, executeDryRun, requestApproval, runDemo } from "../src/index.js";

// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(classifyCommandRisk("rm -rf /").level, "blocked");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(classifyCommandRisk("supervisorctl restart gpmm_backend").level, "approval_required");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(classifyCommandRisk("cat /tmp/app.log").level, "low");

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const plan = createRemoteCommandPlan({ user: "ren", target: "test", command: "supervisorctl status" });
// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const approval = requestApproval(plan);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(approval.status, "pending_approval");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.deepEqual(approval.approvers, ["owner", "sre"]);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const dryRun = executeDryRun(plan);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(dryRun.executed, false);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(dryRun.dryRun, true);

// 定义常量：这个值只在当前作用域读取，不会被重新赋值。
const blocked = requestApproval(createRemoteCommandPlan({ user: "ren", target: "prod", command: "rm -rf /" }));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(blocked.ok, false);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(blocked.status, "blocked");

// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runDemo().day, 43);

// 输出到 stdout：这里是命令的正式结果，方便脚本继续处理。
console.log("day43 tests passed");
