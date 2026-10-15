import assert from 'node:assert/strict';
import test from 'node:test';
import { addCalendarMonths } from '../lib/dates';

test('adds calendar months and clamps to the last day of shorter months', () => {
  assert.equal(addCalendarMonths(new Date('2026-01-31T12:30:00.000Z'), 1).toISOString(), '2026-02-28T12:30:00.000Z');
  assert.equal(addCalendarMonths(new Date('2024-12-31T00:00:00.000Z'), 2).toISOString(), '2025-02-28T00:00:00.000Z');
});

test('preserves the day when the target month has it', () => {
  assert.equal(addCalendarMonths(new Date('2026-01-15T04:05:06.000Z'), 2).toISOString(), '2026-03-15T04:05:06.000Z');
});

test('calendar expiry is timezone-independent across the Europe/Rome DST transition', () => {
  const beforeSpringChange = new Date('2026-03-29T00:30:00.000Z');
  const beforeAutumnChange = new Date('2026-10-25T00:30:00.000Z');
  assert.equal(addCalendarMonths(beforeSpringChange, 2).toISOString(), '2026-05-29T00:30:00.000Z');
  assert.equal(addCalendarMonths(beforeAutumnChange, 2).toISOString(), '2026-12-25T00:30:00.000Z');
});
