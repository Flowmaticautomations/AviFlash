// Client-side validation only, for fast feedback — the real authority on
// password rules is whatever Supabase Auth is configured with; signUp()'s
// own error message is always shown too in case this baseline is looser or
// stricter than the dashboard's actual policy (see TODO_DECISIONS.md).

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return /^[0-9+()\-\s]{7,}$/.test(value.trim());
}

export function passwordIssue(value: string): string | null {
  if (value.length < 8) return 'Password must be at least 8 characters.';
  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
    return 'Password must include at least one letter and one number.';
  }
  return null;
}
