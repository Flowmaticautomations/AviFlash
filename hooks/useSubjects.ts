import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import type { Tables } from '../lib/database.types';

export type Subject = Tables<'subjects'>;

export function useSubjects() {
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
  async function createSubject(name: string) {
    if (!session) throw new Error('Not signed in');
    const { data, error } = await supabase
      .from('subjects')
      .insert({ user_id: session.user.id, name, academic_year: null })
      .select()
      .single();
    if (error) throw error;
    await refresh();
    return data;
  }

  async function renameSubject(id: string, name: string) {
    const { error } = await supabase.from('subjects').update({ name }).eq('id', id);
    if (error) throw error;
    await refresh();
  }

  async function archiveSubject(id: string) {
    const { error } = await supabase.from('subjects').update({ archived: true }).eq('id', id);
    if (error) throw error;
    await refresh();
  }

  return { subjects, loading, refresh, createSubject, renameSubject, archiveSubject };
}
