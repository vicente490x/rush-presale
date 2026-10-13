import test from 'node:test';
import assert from 'node:assert/strict';
import { addMonths } from './dates.js';

test('adds two calendar months and clamps to the final day of the target month', () => {
  assert.equal(addMonths('2026-01-31T12:34:56.789Z', 2).toISOString(), '2026-03-31T12:34:56.789Z');
  assert.equal(addMonths('2026-12-31T12:34:56.789Z', 2).toISOString(), '2027-02-28T12:34:56.789Z');
  assert.equal(addMonths('2024-01-31T12:34:56.789Z', 1).toISOString(), '2024-02-29T12:34:56.789Z');
});
