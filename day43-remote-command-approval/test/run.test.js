// 学习目标：验证高危命令会被阻断，服务操作需要审批，demo 不执行真实命令。
import assert from "node:assert/strict";
import { classifyCommandRisk, createRemoteCommandPlan, executeDryRun, requestApproval, runDemo } from "../src/index.js";

assert.equal(classifyCommandRisk("rm -rf /").level, "blocked");
assert.equal(classifyCommandRisk("supervisorctl restart gpmm_backend").level, "approval_required");
assert.equal(classifyCommandRisk("cat /tmp/app.log").level, "low");

const plan = createRemoteCommandPlan({ user: "ren", target: "test", command: "supervisorctl status" });
const approval = requestApproval(plan);
assert.equal(approval.status, "pending_approval");
assert.deepEqual(approval.approvers, ["owner", "sre"]);

const dryRun = executeDryRun(plan);
assert.equal(dryRun.executed, false);
assert.equal(dryRun.dryRun, true);

const blocked = requestApproval(createRemoteCommandPlan({ user: "ren", target: "prod", command: "rm -rf /" }));
assert.equal(blocked.ok, false);
assert.equal(blocked.status, "blocked");

assert.equal(runDemo().day, 43);

console.log("day43 tests passed");
