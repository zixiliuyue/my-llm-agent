#!/usr/bin/env node
/**
 * day31-day40 端到端 mock demo。
 *
 * 学习目标：把 prompt 优化、ComfyUI 请求、图片队列、资产记录和视频评估串起来，
 * 但不访问真实 Ollama、ComfyUI、FramePack，也不生成图片或视频文件。
 */
import {
  buildOllamaPromptRequest,
  optimizeImagePrompt,
} from '../day35-prompt-to-image-agent/src/index.js';
import {
  buildPromptRequest,
  createDemoWorkflow,
  normalizeLocalComfyHost,
} from '../day33-comfyui-text-to-image/src/index.js';
import {
  reduceQueue,
  summarizeQueue,
} from '../day34-image-job-queue-ui/src/index.js';
import {
  createImageAssetRecord,
} from '../day36-local-image-assets/src/index.js';
import {
  buildImageToVideoPlan,
} from '../day38-local-video-first-step/src/index.js';
import {
  evaluateFramePackReadiness,
} from '../day39-framepack-video-local/src/index.js';
import {
  evaluateWanForLearning,
} from '../day40-wan-video-evaluation/src/index.js';

const input = process.argv.slice(2).join(' ').trim() || '一个本地 agent 平台封面图';

function createImageQueue(prompt, outputPath) {
  let queue = [];
  queue = reduceQueue(queue, {
    type: 'enqueue',
    payload: {
      prompt,
      provider: 'comfy:image',
      workflow: 'sdxl-base',
    },
  });
  const jobId = queue[0].id;
  queue = reduceQueue(queue, { type: 'update', id: jobId, event: { type: 'start' } });
  queue = reduceQueue(queue, { type: 'update', id: jobId, event: { type: 'progress', progress: 64 } });
  queue = reduceQueue(queue, {
    type: 'update',
    id: jobId,
    event: { type: 'done', output: outputPath },
  });
  return queue;
}

try {
  const optimizedPrompt = optimizeImagePrompt({ userText: input, style: 'study' });
  const workflow = createDemoWorkflow(optimizedPrompt.positivePrompt);
  const comfyRequest = buildPromptRequest({ workflow, clientId: 'local-multimodal-demo' });
  const outputPath = 'outputs/local-multimodal-demo.png';
  const queue = createImageQueue(optimizedPrompt.positivePrompt, outputPath);
  const asset = createImageAssetRecord({
    prompt: optimizedPrompt.positivePrompt,
    outputPath,
    model: optimizedPrompt.handoff.workflowProfile,
    workflow: 'text-to-image',
    seed: 5060,
  });
  const videoPlan = buildImageToVideoPlan({
    sourceImage: asset.outputPath,
    frames: 14,
    size: '576x1024',
  });
  const framepack = evaluateFramePackReadiness({
    platform: 'win32',
    gpuName: 'NVIDIA GeForce RTX 5060 Ti',
    vramGb: 16,
    memoryGb: 32,
  });
  const wan = evaluateWanForLearning({
    platform: 'win32',
    gpuVendor: 'nvidia',
    vramGb: 16,
  });

  console.log(JSON.stringify({
    title: 'day31-day40 local multimodal mock',
    localOnly: true,
    input,
    ollamaRequest: buildOllamaPromptRequest({ userText: input }),
    comfyHost: normalizeLocalComfyHost(),
    optimizedPrompt,
    comfyRequest,
    queue,
    queueSummary: summarizeQueue(queue),
    asset,
    videoPlan,
    framepack,
    wan,
    nextRealSteps: [
      '手动启动 Ollama/ComfyUI/FramePack 后先运行 npm run doctor。',
      '把 comfyRequest 发给本机 COMFYUI_HOST /prompt。',
      '用真实输出文件路径替换 asset.outputPath，再进入视频 plan。',
    ],
  }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
