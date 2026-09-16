import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import type { Tables } from '../lib/database.types';

export type Subject = Tables<'subjects'>;

interface SubjectsValue {
  subjects: Subject[];
  loading: boolean;
  refresh: () => Promise<void>;
  createSubject: (name: string) => Promise<Subject | null>;
  renameSubject: (id: string, name: string) => Promise<void>;
  archiveSubject: (id: string) => Promise<void>;
}

const SubjectsContext = createContext<SubjectsValue | undefined>(undefined);

// Shared via Context (not a plain hook with its own useState), same reason
// as ActiveSubjectProvider: every screen that calls useSubjects() used to
// fetch its own independent copy, so creating a subject on the Subjects
// screen and returning to Dashboard re-triggered a full network fetch there
// -- a visible "Loading..." flash for data that had just loaded a moment
// earlier one screen away. One shared fetch, shared everywhere, fixes it.
export function SubjectsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session) {
      setSubjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // RLS already scopes this to the caller's own rows; no need to filter by
    // user_id here too.
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .eq('archived', false)
      .order('created_at', { ascending: true });
    setSubjects(data ?? []);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // academic_year is no longer collected anywhere in the app (product
  // decision -- school year/grade tracking was dropped). The column stays
  // (existing rows may still have an old value), but nothing writes to it
  // going forward.
  const createSubject = useCallback(
    async (name: string) => {
      if (!session) throw new Error('Not signed in');
      const { data, error } = await supabase
        .from('subjects')
        .insert({ user_id: session.user.id, name, academic_year: null })
        .select()
        .single();
      if (error) throw error;
      await refresh();
      return data;
    },
    [session, refresh]
  );

  const renameSubject = useCallback(
    async (id: string, name: string) => {
      const { error } = await supabase.from('subjects').update({ name }).eq('id', id);
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  const archiveSubject = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('subjects').update({ archived: true }).eq('id', id);
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  return (
    <SubjectsContext.Provider value={{ subjects, loading, refresh, createSubject, renameSubject, archiveSubject }}>
      {children}
    </SubjectsContext.Provider>
  );
}

export function useSubjects(): SubjectsValue {
  const ctx = useContext(SubjectsContext);
  if (!ctx) throw new Error('useSubjects must be used within a SubjectsProvider');
  return ctx;
}
