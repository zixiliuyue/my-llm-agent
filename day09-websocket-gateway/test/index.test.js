import assert from 'node:assert/strict';

import { createDemoInput, lesson, runDemo, validateDemo } from '../src/index.js';

const input = createDemoInput({ message: 'test message' });
assert.equal(input.mode, 'mock');

const result = runDemo(input);
assert.equal(result.ok, true);
assert.equal(result.lesson.day, '09');
assert.ok(result.events.length > 0);
assert.equal(result.summary.safeMode, true);

const validation = validateDemo(result);
assert.equal(validation.ok, true);
assert.ok(lesson.concepts.length > 0);
assert.ok(lesson.artifacts.length > 0);

console.log('day09 tests passed');
