import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import type { Tables } from '../lib/database.types';

export type Deck = Tables<'decks'>;

// "Deck" in the DB, "Card Set" in the UI — see BUILD_LOG.md Phase 5 for why.
export function useDecks(subjectId: string | null) {
  const { session } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session || !subjectId) {
      setDecks([]);
      setCardCounts({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('decks')
      .select('*')
      .eq('subject_id', subjectId)
      .eq('archived', false)
      .order('created_at', { ascending: true });
    setDecks(data ?? []);

    const deckIds = (data ?? []).map((d) => d.id);
    if (deckIds.length > 0) {
      // One query for all decks' counts rather than one per deck — active
      // (non-archived) cards only, matching what View Cards shows.
      const { data: cardRows } = await supabase
        .from('flashcards')
        .select('deck_id')
        .in('deck_id', deckIds)
        .eq('archived', false);
      const counts: Record<string, number> = {};
      for (const row of cardRows ?? []) {
        counts[row.deck_id] = (counts[row.deck_id] ?? 0) + 1;
      }
      setCardCounts(counts);
    } else {
      setCardCounts({});
    }
    setLoading(false);
  }, [session, subjectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function createDeck(name: string) {
    if (!session || !subjectId) throw new Error('Select a subject first.');
    const { data, error } = await supabase
      .from('decks')
      .insert({ user_id: session.user.id, subject_id: subjectId, name })
      .select()
      .single();
    if (error) throw error;
    await refresh();
    return data;
  }

  async function renameDeck(id: string, name: string) {
    const { error } = await supabase.from('decks').update({ name }).eq('id', id);
    if (error) throw error;
    await refresh();
  }

  async function archiveDeck(id: string) {
    const { error } = await supabase.from('decks').update({ archived: true }).eq('id', id);
    if (error) throw error;
    await refresh();
  }

  // Safe because RLS + the enforce_same_owner trigger (Phase 2) already
  // reject moving a deck to a subject that isn't this user's own — this
  // just needs to update one column.
  async function moveDeck(id: string, newSubjectId: string) {
    const { error } = await supabase.from('decks').update({ subject_id: newSubjectId }).eq('id', id);
    if (error) throw error;
    await refresh();
  }

  return { decks, cardCounts, loading, refresh, createDeck, renameDeck, archiveDeck, moveDeck };
}
