import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Banner, PrimaryButton, ScreenContainer, ScreenSubtitle, ScreenTitle, SecondaryButton } from '../components/ui';
import { ImageGallery } from '../components/ImageGallery';
import { useThemeColors } from '../hooks/useThemeColors';
import { useActiveSubject } from '../hooks/useActiveSubject';
import { useCardImages } from '../hooks/useCardImages';
import { Deck, useDecks } from '../hooks/useDecks';
import { Flashcard, useDeckCards } from '../hooks/useDeckCards';
import { ReviewSession, saveReviewSession, useLastCompletedSession } from '../hooks/useReviewSessions';
import { useSubjects } from '../hooks/useSubjects';
import { useAuth } from '../lib/auth';

type OrderMode = 'original' | 'shuffled';
type Phase = 'select-deck' | 'select-order' | 'reviewing' | 'results';

function subjectLabel(name: string) {
  return name;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatAccuracy(value: number | null): string {
  return value === null ? '—' : `${value}%`;
}

// started_at/completed_at are genuinely different timestamps (not the same
// instant) per the Phase 7 fix — safe to compute a real duration from them.
function formatDuration(startedAt: string, completedAt: string): string {
  const seconds = Math.max(0, Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

export default function Review() {
  const colors = useThemeColors();
  const router = useRouter();
  const { session } = useAuth();

  const { subjects } = useSubjects();
  const { activeSubjectId } = useActiveSubject();
  const activeSubject = subjects.find((s) => s.id === activeSubjectId) ?? null;

  const { decks, cardCounts, loading: decksLoading } = useDecks(activeSubjectId);

  const [phase, setPhase] = useState<Phase>('select-deck');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const selectedDeck = decks.find((d) => d.id === selectedDeckId) ?? null;
  const { cards, loading: cardsLoading } = useDeckCards(selectedDeckId);
  const { session: previousSession, refresh: refreshPreviousSession } = useLastCompletedSession(selectedDeckId);

  // Review always shuffles now -- the Original/Shuffle choice screen was
  // removed per product decision (was confusing, shuffle is the actual
  // desired default). orderMode is kept as a constant, not a picked value,
  // since saveReviewSession still records which mode a session used.
  const orderMode: OrderMode = 'shuffled';

  const [reviewCards, setReviewCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [answers, setAnswers] = useState<{ flashcardId: string; markedCorrect: boolean }[]>([]);
  // Called unconditionally (id is null outside the reviewing phase) — Rules
  // of Hooks don't allow this only inside the `phase === 'reviewing'` branch.
  const currentReviewCard = reviewCards[currentIndex] ?? null;
  const { images: currentCardImages } = useCardImages(currentReviewCard?.id ?? null);
  const reviewStartedAt = useRef<string>('');
  const resultBaselineAccuracy = useRef<number | null>(null);

  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [completedSession, setCompletedSession] = useState<ReviewSession | null>(null);

  function handleSelectDeck(deck: Deck) {
    setSelectedDeckId(deck.id);
    setPhase('select-order');
  }

  function backToDeckList() {
    setSelectedDeckId(null);
    setPhase('select-deck');
  }

  function handleStartReview() {
    if (cards.length === 0) return;
    resultBaselineAccuracy.current = previousSession?.accuracy_percent ?? null;
    reviewStartedAt.current = new Date().toISOString();
    setReviewCards(orderMode === 'shuffled' ? shuffle(cards) : cards);
    setCurrentIndex(0);
    setShowAnswer(false);
    setAnswers([]);
    setSaveError(null);
    setConfirmingLeave(false);
    setPhase('reviewing');
  }

  async function handleMark(markedCorrect: boolean) {
    const card = reviewCards[currentIndex];
    const nextAnswers = [...answers, { flashcardId: card.id, markedCorrect }];
    setAnswers(nextAnswers);
    setShowAnswer(false);

    if (currentIndex + 1 < reviewCards.length) {
      setCurrentIndex(currentIndex + 1);
      return;
    }

    if (!session || !selectedDeck) return;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await saveReviewSession({
        userId: session.user.id,
        deckId: selectedDeck.id,
        orderMode,
        startedAt: reviewStartedAt.current,
        answers: nextAnswers,
      });
      setCompletedSession(saved);
      await refreshPreviousSession();
      setPhase('results');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save this review.');
    } finally {
      setSaving(false);
    }
  }

  function handleReviewAgain() {
    setCompletedSession(null);
    setPhase('select-order');
  }

  function guardedLeaveReview(after: () => void) {
    if (!confirmingLeave) {
      setConfirmingLeave(true);
      return;
    }
    setConfirmingLeave(false);
    after();
  }

  if (!activeSubject) {
    return (
      <ScreenContainer>
        <ScreenTitle>Review</ScreenTitle>
        <ScreenSubtitle>You need an active subject before you can start a review.</ScreenSubtitle>
        <Banner kind="info">Select or create a subject first, then come back here.</Banner>
        <PrimaryButton title="Manage Subjects" onPress={() => router.push('/subjects')} />
      </ScreenContainer>
    );
  }

  if (phase === 'select-deck') {
    return (
      <ScreenContainer>
        <ScreenTitle>Review</ScreenTitle>
        <ScreenSubtitle>{subjectLabel(activeSubject.name)}</ScreenSubtitle>

        {decksLoading ? (
          <Text style={{ color: colors.muted }}>Loading card sets…</Text>
        ) : decks.length === 0 ? (
          <>
            <Banner kind="info">No card sets yet for {activeSubject.name}.</Banner>
            <PrimaryButton title="Create a card set" onPress={() => router.push('/new-card')} />
          </>
        ) : (
          decks.map((deck) => (
            <Pressable
              key={deck.id}
              onPress={() => handleSelectDeck(deck)}
              style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>{deck.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
                {cardCounts[deck.id] ?? 0} card{(cardCounts[deck.id] ?? 0) === 1 ? '' : 's'}
              </Text>
            </Pressable>
          ))
        )}

        <Pressable onPress={() => router.push('/dashboard')} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.muted, textAlign: 'center' }}>Back to Dashboard</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  if (phase === 'select-order' && selectedDeck) {
    return (
      <ScreenContainer>
        <ScreenTitle>Review</ScreenTitle>
        <ScreenSubtitle>{selectedDeck.name}</ScreenSubtitle>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>Previous accuracy</Text>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>
            {previousSession ? formatAccuracy(previousSession.accuracy_percent) : 'No previous review yet'}
          </Text>
        </View>

        {cardsLoading ? (
          <Text style={{ color: colors.muted }}>Loading cards…</Text>
        ) : cards.length === 0 ? (
          <Banner kind="info">This card set has no cards yet — add some from New Card first.</Banner>
        ) : (
          <PrimaryButton title={`Start review (${cards.length} cards)`} onPress={handleStartReview} />
        )}

        <Pressable onPress={backToDeckList} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.muted, textAlign: 'center' }}>Choose a different card set</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  if (phase === 'reviewing') {
    const card = reviewCards[currentIndex];
    const correctSoFar = answers.filter((a) => a.markedCorrect).length;

    return (
      <ScreenContainer>
        <ScreenTitle>Review</ScreenTitle>
        <ScreenSubtitle>
          Card {currentIndex + 1} of {reviewCards.length} · Score {correctSoFar}/{answers.length}
        </ScreenSubtitle>

        {confirmingLeave ? (
          <Banner kind="error">Leaving now will lose this review&apos;s progress.</Banner>
        ) : null}
        {saveError ? <Banner kind="error">{saveError}</Banner> : null}

        <View style={[styles.card, { borderColor: colors.tint, backgroundColor: colors.card }]}>
          <Text style={[styles.cardLabel, { color: colors.muted }]}>Question</Text>
          {card.question_text ? <Text style={[styles.cardText, { color: colors.text }]}>{card.question_text}</Text> : null}
          <ImageGallery
            images={currentCardImages.filter((i) => i.side === 'question')}
            label="Question image"
            variant="button"
          />

          {showAnswer ? (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.cardLabel, { color: colors.muted }]}>Answer</Text>
              {card.answer_text ? <Text style={[styles.cardText, { color: colors.text }]}>{card.answer_text}</Text> : null}
              <ImageGallery
                images={currentCardImages.filter((i) => i.side === 'answer')}
                label="Answer image"
                variant="button"
              />
            </>
          ) : null}
        </View>

        {!showAnswer ? (
          <PrimaryButton title="Show Answer" onPress={() => setShowAnswer(true)} />
        ) : (
          <View style={styles.markRow}>
            <Pressable
              onPress={() => handleMark(false)}
              disabled={saving}
              style={[styles.markButton, { backgroundColor: colors.accent, opacity: saving ? 0.6 : 1 }]}
            >
              <Text style={styles.markButtonText}>Incorrect</Text>
            </Pressable>
            <Pressable
              onPress={() => handleMark(true)}
              disabled={saving}
              style={[styles.markButton, { backgroundColor: colors.tint, opacity: saving ? 0.6 : 1 }]}
            >
              <Text style={styles.markButtonText}>Correct</Text>
            </Pressable>
          </View>
        )}

        <Pressable onPress={() => guardedLeaveReview(backToDeckList)} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.muted, textAlign: 'center' }}>
            {confirmingLeave ? 'Tap again to leave without saving' : 'Cancel review'}
          </Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  if (phase === 'results' && completedSession && selectedDeck) {
    const accuracy = completedSession.accuracy_percent;
    const baseline = resultBaselineAccuracy.current;
    const change = accuracy !== null && baseline !== null ? Math.round((accuracy - baseline) * 10) / 10 : null;

    return (
      <ScreenContainer>
        <ScreenTitle>Review complete</ScreenTitle>
        <ScreenSubtitle>{selectedDeck.name}</ScreenSubtitle>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View style={styles.statRow}>
            <Text style={{ color: colors.muted }}>Total cards</Text>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{completedSession.total_cards}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={{ color: colors.muted }}>Correct</Text>
            <Text style={{ color: colors.tint, fontWeight: '700' }}>{completedSession.correct_count}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={{ color: colors.muted }}>Incorrect</Text>
            <Text style={{ color: colors.accent, fontWeight: '700' }}>{completedSession.incorrect_count}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={{ color: colors.muted }}>Time taken</Text>
            <Text style={{ color: colors.text, fontWeight: '700' }}>
              {formatDuration(completedSession.started_at, completedSession.completed_at ?? new Date().toISOString())}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.statRow}>
            <Text style={{ color: colors.muted }}>Accuracy</Text>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{formatAccuracy(accuracy)}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={{ color: colors.muted }}>Previous accuracy</Text>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{formatAccuracy(baseline)}</Text>
          </View>
          {change !== null ? (
            <View style={styles.statRow}>
              <Text style={{ color: colors.muted }}>{change >= 0 ? 'Improvement' : 'Change'}</Text>
              <Text style={{ color: change >= 0 ? colors.tint : colors.accent, fontWeight: '700' }}>
                {change >= 0 ? '+' : ''}
                {change}%
              </Text>
            </View>
          ) : (
            <Text style={{ color: colors.muted, marginTop: 4 }}>First completed review for this set!</Text>
          )}
        </View>

        <PrimaryButton title="Review again" onPress={handleReviewAgain} />
        <SecondaryButton title="Back to Dashboard" onPress={() => router.push('/dashboard')} />
      </ScreenContainer>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 6,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  markRow: {
    flexDirection: 'row',
    gap: 12,
  },
  markButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  markButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
});
