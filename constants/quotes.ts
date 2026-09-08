// Placeholder quotes only — the real 300-quote content set doesn't exist yet
// (the source spreadsheet has numbers but no quote text; see TODO_DECISIONS.md).
// These are generic, unattributed study/motivation lines so the welcome/login
// screens aren't empty. Swap for a real `quotes` table once that content is
// sourced — don't ship this list to production as-is.
const PLACEHOLDER_QUOTES = [
  'Small steps, repeated daily, beat big efforts done once.',
  "Review today what you'll thank yourself for tomorrow.",
  'Understanding beats memorizing, but a good flashcard gets you both.',
  "You don't need more time — you need one more review session.",
  'Every card you get wrong today is one less mistake in the exam.',
  'Consistency is the whole trick.',
  "Progress isn't always visible, but it's always adding up.",
  'A few focused minutes beats an hour of distracted scrolling.',
];

export function getRandomQuote(): string {
  return PLACEHOLDER_QUOTES[Math.floor(Math.random() * PLACEHOLDER_QUOTES.length)];
}
