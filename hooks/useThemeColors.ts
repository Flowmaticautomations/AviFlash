import { useTheme } from './useTheme';

// Thin wrapper kept so every existing `const colors = useThemeColors();`
// call site (every screen) is untouched by the switch from system-driven
// light/dark to the three manually-picked themes in useTheme.tsx.
export function useThemeColors() {
  return useTheme().colors;
}
