// 学习目标：验证高危命令直接阻断，服务生命周期命令进入审批，读日志只生成 dry-run。
import assert from "node:assert/strict";
import { buildRemoteExecutionPlan, classifyCommandRisk } from "../src/index.js";

assert.equal(classifyCommandRisk("rm -rf /").status, "blocked");
assert.equal(classifyCommandRisk("journalctl -u gpmm_backend -n 100").status, "dry-run-ready");
assert.equal(classifyCommandRisk("systemctl restart gpmm_backend").status, "pending-approval");

const plan = buildRemoteExecutionPlan({ command: "supervisorctl restart owl-health", target: "sit-health-01" });
assert.equal(plan.dryRun, true);
assert.equal(plan.approvalRequired, true);
assert.ok(plan.rollback.length >= 3);
assert.equal(plan.audit.executed, false);

const blocked = buildRemoteExecutionPlan({ command: "drop database prod" });
assert.equal(blocked.status, "blocked");
assert.equal(blocked.approvalRequired, false);

console.log("day48 tests passed");
