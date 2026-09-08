import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Tables } from '../lib/database.types';

export type Flashcard = Tables<'flashcards'>;

// No user_id needed here (unlike useSubjects/useDecks' createX functions) —
// UPDATE never needs it supplied, RLS's `user_id = auth.uid()` policy already
// restricts which rows can be touched; editing question/answer/archived never
// touches user_id or deck_id, so ownership and the card set relation can't
// drift as a side effect of these calls.
export function useDeckCards(deckId: string | null) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!deckId) {
      setCards([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('flashcards')
      .select('*')
      .eq('deck_id', deckId)
      .eq('archived', false)
      .order('card_order', { ascending: true });
    setCards(data ?? []);
    setLoading(false);
  }, [deckId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // question/answer accept '' and store it as null — keeps an image-only side
  // consistent with how New Card saves one (Phase 8), rather than an empty
  // string that reads differently from "no text" everywhere else.
  async function updateCard(id: string, question: string, answer: string) {
    const { error } = await supabase
      .from('flashcards')
      .update({ question_text: question || null, answer_text: answer || null })
      .eq('id', id);
    if (error) throw error;
    await refresh();
  }

  async function archiveCard(id: string) {
    const { error } = await supabase.from('flashcards').update({ archived: true }).eq('id', id);
    if (error) throw error;
    await refresh();
  }

  return { cards, loading, refresh, updateCard, archiveCard };
}
