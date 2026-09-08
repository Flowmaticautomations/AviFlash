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

  async function createSubject(name: string, academicYear: string | null) {
    if (!session) throw new Error('Not signed in');
    const { data, error } = await supabase
      .from('subjects')
      .insert({ user_id: session.user.id, name, academic_year: academicYear })
      .select()
      .single();
    if (error) throw error;
    await refresh();
    return data;
  }

  async function renameSubject(id: string, name: string, academicYear: string | null) {
    const { error } = await supabase.from('subjects').update({ name, academic_year: academicYear }).eq('id', id);
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
