/**
 * Day 13：自包含学习源码。
 *
 * 这个文件属于 day13-tool-policy，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// node:assert/strict 提供严格断言；断言失败会让 npm test 退出非 0。
import assert from 'node:assert/strict';

// 从当天核心文件导入要测试的公开能力。
import { 
  createDemoInput, 
  lesson, 
  runDemo, 
  validateDemo,
  classifyToolRisk,
  checkApproval,
  TOOL_RISK_LEVELS
} from '../src/index.js';

// ============================================
// 测试 1: 基础输入和元信息
// ============================================
console.log('测试 1: 基础输入和元信息');

// 构造一个自定义输入，验证 overrides 能覆盖默认 message。
const input = createDemoInput({ message: 'test message' });
// mode 应该固定为 mock，表示测试不会触发真实模型或远程副作用。
// 测试断言：把预期行为写死，防止后续修改破坏边界。
assert.equal(input.mode, 'mock');
// 验证 tools 字段存在
assert.ok(Array.isArray(input.tools));
assert.equal(input.tools.length, 3);

// ============================================
// 测试 2: 工具风险分级 classifyToolRisk
// ============================================
console.log('测试 2: 工具风险分级 classifyToolRisk');

// 测试只读工具 - 低风险
const readRisk = classifyToolRisk('read_file');
assert.equal(readRisk.level, 'low');
assert.equal(readRisk.autoApprove, true);

// 测试更多只读工具
assert.equal(classifyToolRisk('list_files').level, 'low');
assert.equal(classifyToolRisk('get_status').level, 'low');
assert.equal(classifyToolRisk('search_code').level, 'low');
assert.equal(classifyToolRisk('cat_file').level, 'low');
assert.equal(classifyToolRisk('ls_dir').level, 'low');
assert.equal(classifyToolRisk('find_files').level, 'low');

// 测试本地写入工具 - 中等风险
const writeRisk = classifyToolRisk('write_file');
assert.equal(writeRisk.level, 'medium');
assert.equal(writeRisk.autoApprove, false);

// 测试更多写入工具
assert.equal(classifyToolRisk('save_file').level, 'medium');
assert.equal(classifyToolRisk('delete_file').level, 'medium');
assert.equal(classifyToolRisk('remove_file').level, 'medium');
assert.equal(classifyToolRisk('rm_file').level, 'medium');
assert.equal(classifyToolRisk('mv_file').level, 'medium');
assert.equal(classifyToolRisk('create_file').level, 'medium');
assert.equal(classifyToolRisk('mkdir_dir').level, 'medium');

// 测试远程工具 - 高风险，阻止
const remoteRisk = classifyToolRisk('ssh_exec');
assert.equal(remoteRisk.level, 'high');
assert.equal(remoteRisk.autoApprove, false);
assert.equal(remoteRisk.blocked, true);

// 测试更多远程工具
assert.equal(classifyToolRisk('scp_file').level, 'high');
assert.equal(classifyToolRisk('curl_url').level, 'high');
assert.equal(classifyToolRisk('wget_url').level, 'high');
assert.equal(classifyToolRisk('remote_exec').level, 'high');
assert.equal(classifyToolRisk('http_request').level, 'high');

// 测试未知工具 - 默认中等风险
const unknownRisk = classifyToolRisk('unknown_tool');
assert.equal(unknownRisk.level, 'medium');
assert.equal(unknownRisk.autoApprove, false);

// 测试参数校验 - 非字符串应该抛出错误
assert.throws(() => classifyToolRisk(123), /工具名称必须是字符串/);
assert.throws(() => classifyToolRisk(null), /工具名称必须是字符串/);
assert.throws(() => classifyToolRisk(undefined), /工具名称必须是字符串/);

// ============================================
// 测试 3: 审批链 checkApproval
// ============================================
console.log('测试 3: 审批链 checkApproval');

// 只读工具自动批准
const readApproval = checkApproval('read_file');
assert.equal(readApproval.approved, true);
assert.equal(readApproval.autoApproved, true);
assert.equal(readApproval.blocked, undefined);

// 本地写入工具需要审批
const writeApproval = checkApproval('write_file');
assert.equal(writeApproval.approved, false);
assert.equal(writeApproval.pendingApproval, true);
assert.equal(writeApproval.blocked, undefined);

// 远程工具直接阻止
const remoteApproval = checkApproval('ssh_exec');
assert.equal(remoteApproval.approved, false);
assert.equal(remoteApproval.blocked, true);
assert.equal(remoteApproval.pendingApproval, undefined);

// 审批上下文
const contextApproval = checkApproval('write_file', { actor: 'tester' });
assert.equal(contextApproval.approver, 'tester');

// ============================================
// 测试 4: runDemo 完整流程
// ============================================
console.log('测试 4: runDemo 完整流程');

// 运行当天 demo，拿到统一结构结果。
const result = runDemo(input);
// ok=true 表示主流程成功。
assert.equal(result.ok, true);
// lesson.day 必须等于当天编号，防止目录和元信息不一致。
assert.equal(result.lesson.day, '13');
// events 必须有内容，因为事件流是本项目学习 mini-openclaw 的核心输出。
assert.ok(result.events.length > 0);
// safeMode 必须为 true，保证教学示例没有真实副作用。
assert.equal(result.summary.safeMode, true);

// 验证工具评估结果存在
assert.ok(result.toolResults);
assert.equal(result.toolResults.length, 3);

// 验证每个工具的评估结果
const readResult = result.toolResults.find(r => r.name === 'read_file');
assert.ok(readResult);
assert.equal(readResult.riskLevel, 'low');
assert.equal(readResult.approved, true);
assert.equal(readResult.status, 'ready');

const writeResult = result.toolResults.find(r => r.name === 'write_file');
assert.ok(writeResult);
assert.equal(writeResult.riskLevel, 'medium');
assert.equal(writeResult.approved, false);
assert.equal(writeResult.pendingApproval, true);
assert.equal(writeResult.status, 'pending');

const sshResult = result.toolResults.find(r => r.name === 'ssh_exec');
assert.ok(sshResult);
assert.equal(sshResult.riskLevel, 'high');
assert.equal(sshResult.approved, false);
assert.equal(sshResult.blocked, true);
assert.equal(sshResult.status, 'blocked');

// 验证统计信息
assert.equal(result.summary.approvedCount, 1);
assert.equal(result.summary.pendingCount, 1);
assert.equal(result.summary.blockedCount, 1);
assert.equal(result.summary.totalTools, 3);

// ============================================
// 测试 5: validateDemo 安全边界校验
// ============================================
console.log('测试 5: validateDemo 安全边界校验');

// 正常结果应该通过
const validation = validateDemo(result);
assert.equal(validation.ok, true);

// 测试各种失败情况
assert.equal(validateDemo(null).ok, false);
assert.equal(validateDemo({}).ok, false);
assert.equal(validateDemo({ ok: true }).ok, false);
assert.equal(validateDemo({ ok: true, events: [] }).ok, false);
assert.equal(validateDemo({ ok: true, events: [1], summary: { safeMode: false } }).ok, false);

// ============================================
// 测试 6: lesson 元信息
// ============================================
console.log('测试 6: lesson 元信息');

// concepts 非空，说明 README/CLI 能展示今天的学习目标。
assert.ok(lesson.concepts.length > 0);
// artifacts 非空，说明今天至少有一个可观察产物。
assert.ok(lesson.artifacts.length > 0);
// 验证 web 标记正确
assert.equal(lesson.web, false);
// 验证 lesson 是冻结的，不能修改
assert.throws(() => { lesson.day = '14'; }, /Cannot assign to read only property/);

// ============================================
// 测试 7: TOOL_RISK_LEVELS 配置
// ============================================
console.log('测试 7: TOOL_RISK_LEVELS 配置');

assert.ok(TOOL_RISK_LEVELS.READ_ONLY);
assert.ok(TOOL_RISK_LEVELS.LOCAL_WRITE);
assert.ok(TOOL_RISK_LEVELS.REMOTE);
// 验证配置是冻结的
assert.throws(() => { TOOL_RISK_LEVELS.READ_ONLY.level = 'high'; }, /Cannot assign to read only property/);

// ============================================
// 测试 8: 空工具列表边界情况
// ============================================
console.log('测试 8: 空工具列表边界情况');

const emptyInput = createDemoInput({ tools: [] });
const emptyResult = runDemo(emptyInput);
assert.equal(emptyResult.ok, true);
assert.equal(emptyResult.toolResults.length, 0);
assert.equal(emptyResult.summary.totalTools, 0);

// 测试通过时输出固定文本，方便 smoke runner 观察。
console.log('day13 tests passed');
