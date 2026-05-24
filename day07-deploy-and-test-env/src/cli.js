#!/usr/bin/env node
import { buildDockerDryRun, buildOllamaConfig, checkOllamaHealth } from './config.js';

function printUsage() {
  console.error('用法:');
  console.error('  npm run day07:config');
  console.error('  npm run day07:health');
  console.error('  npm run day07:dry-run -- --port 11434 --model-dir /data9/ollama');
}

function getArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    return;
  }

  if (process.argv.includes('--health')) {
    const result = await checkOllamaHealth(buildOllamaConfig());
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
    return;
  }

  if (process.argv.includes('--dry-run')) {
    console.log(buildDockerDryRun({
      port: getArg('--port'),
      modelDir: getArg('--model-dir'),
    }));
    return;
  }

  if (process.argv.includes('--config') || process.argv.length <= 2) {
    console.log(JSON.stringify(buildOllamaConfig(), null, 2));
    return;
  }

  printUsage();
  process.exitCode = 2;
}

await main();

