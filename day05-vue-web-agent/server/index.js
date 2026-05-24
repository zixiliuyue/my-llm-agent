#!/usr/bin/env node
import { createAgentHttpServer } from './agent-api.js';

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.error('用法: AGENT_MOCK=1 npm run day05:api');
  console.error('环境变量:');
  console.error('  AGENT_PORT  默认 8787');
  console.error('  AGENT_MOCK  设为 1 时不调用 Ollama');
  process.exit(0);
}

const port = Number(process.env.AGENT_PORT || 8787);
const server = createAgentHttpServer();

server.listen(port, '127.0.0.1', () => {
  console.error(`Day05 agent API listening on http://127.0.0.1:${port}`);
  console.error(`mock=${process.env.AGENT_MOCK === '1' ? 'on' : 'off'}`);
});
