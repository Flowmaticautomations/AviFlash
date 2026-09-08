import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';

function storageKey(userId: string) {
  return `av-flash:active-subject:${userId}`;
}

// Remembers the last-selected subject per user, locally only (AsyncStorage) —
// not synced to Supabase, it's just a UI convenience.
export function useActiveSubject() {
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

  return { activeSubjectId, setActiveSubjectId, loaded };
}
