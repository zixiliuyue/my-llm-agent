#!/usr/bin/env node
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createAgentHttpServer } from './agent-api.js';

// 教学：读取命令行参数：process.argv 前两项是 node 和脚本路径，所以业务参数通常从 slice(2) 开始。
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
  console.error('用法: AGENT_MOCK=1 npm run day05:api');
  // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
  console.error('环境变量:');
  // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
  console.error('  AGENT_PORT  默认 8787');
  // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
  console.error('  AGENT_MOCK  设为 1 时不调用 Ollama');
  // 教学：退出进程：用退出码告诉 shell 当前命令成功还是失败。
  process.exit(0);
}

// 教学：读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
const port = Number(process.env.AGENT_PORT || 8787);
// 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
const server = createAgentHttpServer();

// 教学：操作本地 server：测试或 smoke 会临时启动服务再关闭。
server.listen(port, '127.0.0.1', () => {
  // 教学：输出到 stderr：用于过程日志、错误或帮助信息，不污染 stdout。
  console.error(`Day05 agent API listening on http://127.0.0.1:${port}`);
  // 教学：读取环境变量：允许用户不改源码就切换模型地址、端口或运行模式。
  console.error(`mock=${process.env.AGENT_MOCK === '1' ? 'on' : 'off'}`);
});
