/**
 * Day 43：自包含学习源码。
 *
 * 这个文件属于 day43-remote-command-approval，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 学习目标：验证高危命令会被阻断，服务操作需要审批，demo 不执行真实命令。
import assert from "node:assert/strict";
import { classifyCommandRisk, createRemoteCommandPlan, executeDryRun, requestApproval, runDemo } from "../src/index.js";

// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(classifyCommandRisk("rm -rf /").level, "blocked");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(classifyCommandRisk("supervisorctl restart gpmm_backend").level, "approval_required");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(classifyCommandRisk("cat /tmp/app.log").level, "low");

const plan = createRemoteCommandPlan({ user: "ren", target: "test", command: "supervisorctl status" });
const approval = requestApproval(plan);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(approval.status, "pending_approval");
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.deepEqual(approval.approvers, ["owner", "sre"]);

const dryRun = executeDryRun(plan);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(dryRun.executed, false);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(dryRun.dryRun, true);

const blocked = requestApproval(createRemoteCommandPlan({ user: "ren", target: "prod", command: "rm -rf /" }));
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(blocked.ok, false);
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(blocked.status, "blocked");

// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(runDemo().day, 43);

console.log("day43 tests passed");
