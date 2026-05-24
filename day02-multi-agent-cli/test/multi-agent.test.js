import assert from 'node:assert/strict';

import { parseCritique, parseFinal, parsePlan } from '../src/handoff-protocol.js';
import { runMultiAgent, runToolRunner } from '../src/multi-agent.js';

function createMockClient(responses) {
  const queue = [...responses];
  return {
    async chat(messages) {
      assert.ok(Array.isArray(messages));
      if (queue.length === 0) {
        throw new Error('mock response queue is empty');
      }
      return queue.shift();
    },
  };
}

const plan = parsePlan('{"type":"plan","steps":[{"tool":"calculator","input":{"expression":"(18+24)*3"}}]}');
assert.equal(plan.steps[0].id, 'step-1');
assert.equal(plan.steps[0].tool, 'calculator');

assert.deepEqual(parseCritique('{"type":"critique","ok":true,"issues":[]}'), {
  type: 'critique',
  ok: true,
  issues: [],
});

assert.deepEqual(parseFinal('```json\n{"type":"final","answer":"结果是 126。"}\n```'), {
  type: 'final',
  answer: '结果是 126。',
});

const toolResult = await runToolRunner(plan);
assert.equal(toolResult.observations[0].ok, true);
assert.equal(toolResult.observations[0].result.value, 126);

const events = [];
const result = await runMultiAgent({
  question: '计算 (18+24)*3',
  client: createMockClient([
    '{"type":"plan","steps":[{"id":"calc","tool":"calculator","input":{"expression":"(18+24)*3"},"reason":"需要计算"}]}',
    '{"type":"critique","ok":true,"issues":[]}',
    '{"type":"final","answer":"结果是 126。"}',
  ]),
  onEvent: (event) => events.push(event),
});

assert.equal(result.answer, '结果是 126。');
assert.equal(result.plan.steps[0].id, 'calc');
assert.equal(result.critique.ok, true);
assert.ok(events.some((event) => event.role === 'planner'));
assert.ok(events.some((event) => event.role === 'tool-runner' && event.type === 'tool_call'));
assert.ok(events.some((event) => event.role === 'writer'));

console.log('day02 tests passed');

