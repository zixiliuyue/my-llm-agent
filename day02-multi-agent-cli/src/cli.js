#!/usr/bin/env node
/**
 * Day 2：自包含学习源码。
 *
 * 这个文件属于 day02-multi-agent-cli，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 定义常量：记录当前 day 运行所需的最低 Node 主版本和次版本。
const MIN_NODE_MAJOR = 18;
// 定义常量：记录当前 day 运行所需的最低 Node 主版本和次版本。
const MIN_NODE_MINOR = 17;

/** 打印当前 CLI 的用法说明，帮助学习者直接运行当天示例。 */
function printUsage() {
  console.error('用法:');
  console.error('  在项目根目录: npm run day02:ask -- "你的问题"');
  console.error('  在 day02 目录:  npm run ask -- "你的问题"');
  console.error('');
  console.error('示例:');
  console.error('  npm run ask -- "计算 (18+24)*3"');
  console.error('');
  console.error('环境变量:');
  console.error('  OLLAMA_HOST  默认 http://127.0.0.1:11434');
  console.error('  OLLAMA_MODEL 默认 qwen2.5:7b');
}

/** 把当前 Node 版本解析成数字，便于给出可理解的报错。 */
function parseNodeVersion() {
  // 解构赋值：把版本字符串按点拆开后取出主版本和次版本。
  const [major = '0', minor = '0'] = process.versions.node.split('.');
  return {
    major: Number.parseInt(major, 10) || 0,
    minor: Number.parseInt(minor, 10) || 0,
  };
}

/** 明确校验最低 Node 版本，避免学习者看到难懂的底层语法错误。 */
function ensureSupportedNode() {
  const current = parseNodeVersion();
  if (
    current.major > MIN_NODE_MAJOR ||
    (current.major === MIN_NODE_MAJOR && current.minor >= MIN_NODE_MINOR)
  ) {
    return;
  }
  throw new Error(
    `day02 需要 Node >= ${MIN_NODE_MAJOR}.${MIN_NODE_MINOR}，当前是 ${process.versions.node}。` +
      '请先执行 `nvm use 18.20.8`，或切到任意 >=18.17 的 Node 后重试。',
  );
}

/** 把多 agent 交接事件输出到 stderr，便于观察角色协作过程。 */
function logEvent(event) {
  if (event.type === 'tool_call') {
    console.error(`[${event.role}] 调用工具 ${event.tool} (${event.id})`);
    return;
  }
  console.error(`[${event.role}] ${event.type}: ${event.preview}`);
}

/** CLI 主入口，负责解析参数、调用当天示例并处理错误。 */
async function main() {
  // 尽早做版本校验：避免在旧 Node 上先触发 ESM/top-level await 等难懂报错。
  ensureSupportedNode();
  // 读取命令行参数：process.argv 前两项是 node 和脚本路径，所以业务参数通常从 slice(2) 开始。
  const question = process.argv.slice(2).join(' ').trim();
  if (!question || question === '--help' || question === '-h') {
    // 调用函数：把当前数据交给已有逻辑处理。
    printUsage();
    process.exitCode = question ? 0 : 2;
    return;
  }

  try {
    // 运行时再加载主逻辑：这样旧 Node 能先收到明确版本提示，而不是直接语法报错。
    const { runMultiAgent } = await import('./multi-agent.js');
    const result = await runMultiAgent({ question, onEvent: logEvent });
    console.log(result.answer);
  } catch (error) {
    console.error(`执行失败: ${error.message}`);
    process.exitCode = 1;
  }
}

// 启动异步主流程：避免旧 Node 因顶层 await 直接语法失败。
main().catch((error) => {
  console.error(`执行失败: ${error.message}`);
  process.exitCode = 1;
});
