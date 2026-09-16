import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';

function storageKey(userId: string) {
  return `av-flash:tutorial-seen:${userId}`;
}

// Optional, dismissible, shown-once walkthrough for first-time users --
// same local-only AsyncStorage-per-user pattern as useActiveSubject. Defaults
// to "seen" until the stored flag actually loads, so a returning user never
// sees a flash of the tutorial while it's still being read.
export function useTutorial() {
  const { session } = useAuth();
  const [seen, setSeen] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!session) {
      setLoaded(true);
      return;
    }
    setLoaded(false);
    AsyncStorage.getItem(storageKey(session.user.id)).then((value) => {
      setSeen(value === '1');
      setLoaded(true);
    });
  }, [session]);

  const dismiss = useCallback(() => {
    setSeen(true);
    if (session) AsyncStorage.setItem(storageKey(session.user.id), '1');
  }, [session]);

  return { showTutorial: loaded && !seen, dismiss };
}
