// Plain-Node self-check for computeAccess() — no test framework, run with
// `node lib/access.test.ts` (Node 22.6+/24 strips TS types natively). Kept
// deliberately dependency-free since `access.ts` itself has zero runtime
// imports; a real framework would be overkill for one pure function.
import assert from 'node:assert/strict';
// Extension included so plain `node lib/access.test.ts` (Node's ESM loader,
// no bundler) can resolve it — Metro/tsc resolve extensionless imports fine,
// this file is test-only and never bundled into the app.
import { computeAccess } from './access.ts';

const HOUR = 60 * 60 * 1000;
const future = (ms: number) => new Date(Date.now() + ms).toISOString();
const past = (ms: number) => new Date(Date.now() - ms).toISOString();

function sub(overrides: Partial<{ status: string; trial_ends_at: string; paid_until: string | null }>) {
  return {
    status: 'trialing',
    trial_ends_at: future(HOUR),
    paid_until: null,
    ...overrides,
  };
}

let passed = 0;
function check(name: string, actual: string, expected: string) {
  assert.equal(actual, expected, `${name}: expected ${expected}, got ${actual}`);
  passed++;
}

check('no subscription', computeAccess(null), 'locked');

check('trialing, not yet ended', computeAccess(sub({ status: 'trialing', trial_ends_at: future(HOUR) })), 'trial');
check('trialing, ended', computeAccess(sub({ status: 'trialing', trial_ends_at: past(HOUR) })), 'locked');

check(
  'active, no paid_until set',
  computeAccess(sub({ status: 'active', paid_until: null })),
  'active'
);
check(
  'active, paid_until in the future',
  computeAccess(sub({ status: 'active', paid_until: future(HOUR) })),
  'active'
);
// The actual Phase 9 Step A fix: this used to return 'active' unconditionally.
check(
  'active, paid_until in the past — must lock',
  computeAccess(sub({ status: 'active', paid_until: past(HOUR) })),
  'locked'
);
check(
  'active, paid_until exactly now — must lock (boundary is inclusive)',
  computeAccess(sub({ status: 'active', paid_until: new Date(Date.now() - 1).toISOString() })),
  'locked'
);

check('past_due', computeAccess(sub({ status: 'past_due' })), 'locked');
check('cancelled', computeAccess(sub({ status: 'cancelled' })), 'locked');
check('expired', computeAccess(sub({ status: 'expired' })), 'locked');

console.log(`computeAccess self-check: ${passed} passed`);
