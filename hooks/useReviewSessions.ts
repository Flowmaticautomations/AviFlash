import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Tables } from '../lib/database.types';

export type ReviewSession = Tables<'review_sessions'>;

// The most recently *completed* review session for a deck — used both for
// the "previous accuracy" shown before starting a new review, and (as a
// frozen snapshot taken at start time, not re-read live) for the result
// screen's improvement/drop comparison.
export function useLastCompletedSession(deckId: string | null) {
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!deckId) {
      setSession(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('review_sessions')
      .select('*')
      .eq('deck_id', deckId)
      .eq('was_completed', true)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setSession(data ?? null);
    setLoading(false);
  }, [deckId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { session, loading, refresh };
}

interface SaveReviewSessionInput {
  userId: string;
  deckId: string;
  orderMode: 'original' | 'shuffled';
  startedAt: string;
  answers: { flashcardId: string; markedCorrect: boolean }[];
}

// Only ever called once, at the end of a completed review — there is no
// "in-progress" row saved partway through (see review.tsx's mid-review exit
// guard and BUILD_LOG.md for why: the phase brief asks only completed
// sessions to be saved as completed, so nothing is written until then).
export async function saveReviewSession({
  userId,
  deckId,
  orderMode,
  startedAt,
  answers,
}: SaveReviewSessionInput): Promise<ReviewSession> {
  const correctCount = answers.filter((a) => a.markedCorrect).length;
  const incorrectCount = answers.length - correctCount;

  const { data: session, error: sessionError } = await supabase
    .from('review_sessions')
    .insert({
      user_id: userId,
      deck_id: deckId,
      order_mode: orderMode,
      total_cards: answers.length,
      correct_count: correctCount,
      incorrect_count: incorrectCount,
      was_completed: true,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (sessionError) throw sessionError;

  const answerRows = answers.map((a) => ({
    user_id: userId,
    review_session_id: session.id,
    flashcard_id: a.flashcardId,
    marked_correct: a.markedCorrect,
  }));
  const { error: answersError } = await supabase.from('review_answers').insert(answerRows);
  if (answersError) throw answersError;

  return session;
}
