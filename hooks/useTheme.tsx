import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Colors, DEFAULT_THEME, ThemeName } from '../constants/theme';
import { useAuth } from '../lib/auth';

function storageKey(userId: string) {
  return `av-flash:theme:${userId}`;
}

function isThemeName(value: string | null): value is ThemeName {
  return value === 'midnight' || value === 'light' || value === 'warm';
}

interface ThemeValue {
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
  colors: (typeof Colors)[ThemeName];
}

const ThemeContext = createContext<ThemeValue | undefined>(undefined);

// Manual per-user choice (AsyncStorage), not the device's system light/dark
// setting -- the theme doc's whole point is three specific, designed themes,
// not "whatever the OS happens to prefer". Same shared-Context pattern as
// useActiveSubject/useSubjects so switching in Settings updates every
// screen immediately.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [themeName, setThemeNameState] = useState<ThemeName>(DEFAULT_THEME);

  useEffect(() => {
    if (!session) {
      setThemeNameState(DEFAULT_THEME);
      return;
    }
    AsyncStorage.getItem(storageKey(session.user.id)).then((value) => {
      if (isThemeName(value)) setThemeNameState(value);
    });
  }, [session]);

  const setThemeName = useCallback(
    (name: ThemeName) => {
      setThemeNameState(name);
      if (session) AsyncStorage.setItem(storageKey(session.user.id), name);
    },
    [session]
  );

  return (
    <ThemeContext.Provider value={{ themeName, setThemeName, colors: Colors[themeName] }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
