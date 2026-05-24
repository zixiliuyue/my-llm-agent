/**
 * Day 05：Web Agent 的学习入口。
 *
 * day05 的真实 HTTP API 放在 server/ 目录，Vue 页面放在 frontend/ 目录。
 * 这个 src/index.js 只提供一个轻量汇总函数，让本 day 符合统一结构：
 * README、package.json、src、test 都在同一个 day 目录内。
 */

/** 返回 day05 的核心组成部分，供 CLI 或测试快速理解目录结构。 */
export function describeDay05() {
  return {
    ok: true,
    parts: [
      'server/agent-api.js 提供 /api/health 和 /api/agent',
      'frontend/src/App.vue 展示 message、tool_call、observation、final',
      'test/agent-api.test.js 使用 mock 模式验证 API',
    ],
    safeMode: true,
  };
}

