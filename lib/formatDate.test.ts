// Plain-Node self-check for formatLongDate() -- run with
// `node lib/formatDate.test.ts`.
import assert from 'node:assert/strict';
import { formatLongDate } from './formatDate.ts';

let passed = 0;
function check(name: string, actual: string, expected: string) {
  assert.equal(actual, expected, `${name}: expected ${expected}, got ${actual}`);
  passed++;
}

check('mid-year date', formatLongDate('2026-09-20T00:00:00.000Z'), '20 September 2026');
check('single-digit day, no leading zero', formatLongDate('2026-01-05T00:00:00.000Z'), '5 January 2026');
check('December / year boundary', formatLongDate('2026-12-31T00:00:00.000Z'), '31 December 2026');
check('January / year boundary', formatLongDate('2027-01-01T00:00:00.000Z'), '1 January 2027');

console.log(`formatLongDate self-check: ${passed} passed`);
