// Pure, dependency-free (like access.ts / imageValidation.ts) so it can be
// self-checked with plain node.
//
// Deliberately not `.toLocaleDateString()` -- that renders differently per
// device locale (MM/DD/YYYY, DD/MM/YYYY, etc.), which is exactly the
// "not YYYY-MM-DD, must be day month year" inconsistency being fixed here.
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// "20 September 2026". Uses the UTC getters, not the local ones -- trial_ends_at
// / paid_until are stored as midnight-UTC calendar dates, and reading them
// with getDate()/getMonth() would roll back to the previous day for anyone
// west of UTC (most of the Americas) whenever the device's local time falls
// before that UTC midnight.
export function formatLongDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
