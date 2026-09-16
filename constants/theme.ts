// Palette sampled from the AviFlash logo (graduation cap + open book) for
// brand color, and the three commissioned themes from
// "The best commercial approach is to offer three carefully designed
// themes.docx" (01 — Clients/Aviflash/Documents) for everything else.
//
// Per that doc: Midnight is the default -- soft off-white text on very dark
// navy, deliberately NOT pure white on pure black (too harsh for extended
// reading). Clean Light uses an off-white background, not glaring pure
// white, for the same reason. Each theme's one "accent" color from the doc
// maps to `tint` (buttons, links, progress) -- the doc is explicit that
// strong color belongs there and in feedback/category chrome, never as the
// main flashcard reading-area background. `accent` here is this app's
// separate danger/incorrect-state red, which the doc doesn't specify a
// value for; picked per theme to keep at least 4.5:1 contrast on that
// theme's background (the doc's own WCAG bar).
export const brand = {
  blueDark: '#1B6690',
  blue: '#1C75BC',
  blueLight: '#5EC2F0',
  red: '#C8202A',
  white: '#FFFFFF',
  black: '#111111',
};

export const Colors = {
  midnight: {
    text: '#F1F5F9',
    background: '#121826',
    tint: '#60A5FA',
    accent: '#E2495A',
    muted: '#9CA3AF',
    border: '#26324A',
    card: '#1A2436',
  },
  light: {
    text: '#172033',
    background: '#F7F8FA',
    tint: '#2563EB',
    accent: brand.red,
    muted: '#6B7280',
    border: '#E5E7EB',
    card: '#FFFFFF',
  },
  warm: {
    text: '#292524',
    background: '#FFF7E6',
    tint: '#D97706',
    accent: '#B91C1C',
    muted: '#78716C',
    border: '#EADFC4',
    card: '#FFF1D2',
  },
};

export type ThemeName = keyof typeof Colors;
export const THEME_NAMES: ThemeName[] = ['midnight', 'light', 'warm'];
export const THEME_LABELS: Record<ThemeName, string> = {
  midnight: 'Midnight',
  light: 'Clean Light',
  warm: 'Warm Study',
};
export const DEFAULT_THEME: ThemeName = 'midnight';
