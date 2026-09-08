import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Tables } from './database.types';
import { computeAccess } from './access';
import type { AccessState } from './access';

type Profile = Tables<'profiles'>;
type Subscription = Tables<'subscriptions'>;

export type { AccessState };

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  subscription: Subscription | null;
  access: AccessState;
  refreshProfile: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const loadProfileAndSubscription = useCallback(async (userId: string) => {
    const [{ data: profileRow }, { data: subscriptionRow }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle(),
    ]);
    setProfile(profileRow ?? null);
    setSubscription(subscriptionRow ?? null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      if (data.session) {
        await loadProfileAndSubscription(data.session.user.id);
      }
      if (isMounted) setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      if (newSession) {
        await loadProfileAndSubscription(newSession.user.id);
      } else {
        setProfile(null);
        setSubscription(null);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadProfileAndSubscription]);

  const refreshProfile = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    setProfile(data ?? null);
  }, [session]);

  const refreshSubscription = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase.from('subscriptions').select('*').eq('user_id', session.user.id).maybeSingle();
    setSubscription(data ?? null);
  }, [session]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value: AuthContextValue = {
    loading,
    session,
    profile,
    subscription,
    access: computeAccess(subscription),
    refreshProfile,
    refreshSubscription,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
