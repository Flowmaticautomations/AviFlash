import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';

function storageKey(userId: string) {
  return `av-flash:active-subject:${userId}`;
}

interface ActiveSubjectValue {
  activeSubjectId: string | null;
  setActiveSubjectId: (id: string | null) => void;
  loaded: boolean;
}

const ActiveSubjectContext = createContext<ActiveSubjectValue | undefined>(undefined);

// Remembers the last-selected subject per user, locally only (AsyncStorage) --
// not synced to Supabase, it's just a UI convenience. Shared via Context (not
// a plain hook with its own useState) so that changing the active subject on
// one screen (Subjects) is immediately visible on another (Dashboard) without
// needing a full app reload -- a plain per-call-site useState would give each
// screen its own isolated copy that only happens to agree after a fresh mount
// re-reads AsyncStorage, which is exactly the bug this fixes.
export function ActiveSubjectProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [activeSubjectId, setActiveSubjectIdState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!session) {
      setActiveSubjectIdState(null);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    AsyncStorage.getItem(storageKey(session.user.id)).then((value) => {
      setActiveSubjectIdState(value);
      setLoaded(true);
    });
  }, [session]);

  const setActiveSubjectId = useCallback(
    (id: string | null) => {
      setActiveSubjectIdState(id);
      if (!session) return;
      if (id) {
        AsyncStorage.setItem(storageKey(session.user.id), id);
      } else {
        AsyncStorage.removeItem(storageKey(session.user.id));
      }
    },
    [session]
  );

  return (
    <ActiveSubjectContext.Provider value={{ activeSubjectId, setActiveSubjectId, loaded }}>
      {children}
    </ActiveSubjectContext.Provider>
  );
}

export function useActiveSubject(): ActiveSubjectValue {
  const ctx = useContext(ActiveSubjectContext);
  if (!ctx) throw new Error('useActiveSubject must be used within an ActiveSubjectProvider');
  return ctx;
}
