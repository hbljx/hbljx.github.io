import test from 'node:test';
import assert from 'node:assert/strict';
import { getCountdownPeriods } from '../navigation/about-countdown.js';

test('Sunday counts today, then Monday starts a new week', () => {
  const sunday = getCountdownPeriods(new Date(2026, 10, 15, 23, 59, 59));
  assert.equal(sunday.week.days, 1);
  assert.ok(sunday.week.percent > 0 && sunday.week.percent < 0.01);
  const monday = getCountdownPeriods(new Date(2026, 10, 16));
  assert.deepEqual(monday.week, { days: 7, percent: 100 });
});

test('month and year roll over at local midnight', () => {
  const end = getCountdownPeriods(new Date(2026, 11, 31, 23, 59, 59));
  assert.equal(end.month.days, 1);
  assert.equal(end.year.days, 1);
  const start = getCountdownPeriods(new Date(2027, 0, 1));
  assert.deepEqual(start.month, { days: 31, percent: 100 });
  assert.deepEqual(start.year, { days: 365, percent: 100 });
});

test('leap years include February 29', () => {
  assert.deepEqual(getCountdownPeriods(new Date(2028, 0, 1)).year, { days: 366, percent: 100 });
  assert.deepEqual(getCountdownPeriods(new Date(2028, 1, 1)).month, { days: 29, percent: 100 });
  assert.equal(getCountdownPeriods(new Date(2028, 1, 29, 12)).month.days, 1);
  assert.equal(getCountdownPeriods(new Date(2028, 2, 1)).month.days, 31);
});

test('remaining days follow the calendar through daylight-saving changes', () => {
  for (const month of [2, 10]) {
    const result = getCountdownPeriods(new Date(2026, month, 1));
    assert.equal(result.month.days, month === 2 ? 31 : 30);
    assert.equal(result.month.percent, 100);
  }
});
