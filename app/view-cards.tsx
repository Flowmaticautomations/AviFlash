import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Banner, FormField, PrimaryButton, ScreenContainer, ScreenSubtitle, ScreenTitle } from '../components/ui';
import { ImageGallery } from '../components/ImageGallery';
import { useThemeColors } from '../hooks/useThemeColors';
import { useActiveSubject } from '../hooks/useActiveSubject';
import { CardImageWithUrl, useCardImages } from '../hooks/useCardImages';
import { Deck, useDecks } from '../hooks/useDecks';
import { Flashcard, useDeckCards } from '../hooks/useDeckCards';
import { useSubjects } from '../hooks/useSubjects';
import { useAuth } from '../lib/auth';
import { MAX_IMAGES_PER_SIDE, deleteCardImage, pickImages, uploadCardImage } from '../lib/imageUpload';

const ARCHIVE_WARNING = 'Are you sure? This will remove it from your active cards.';

function subjectLabel(name: string, year: string | null) {
  return year ? `${name} ${year}` : name;
}

export default function ViewCards() {
  const colors = useThemeColors();
  const router = useRouter();

  const { subjects } = useSubjects();
  const { activeSubjectId } = useActiveSubject();
  const activeSubject = subjects.find((s) => s.id === activeSubjectId) ?? null;

  const {
    decks,
    cardCounts,
    loading: decksLoading,
    refresh: refreshDecks,
    renameDeck,
    archiveDeck,
    moveDeck,
  } = useDecks(activeSubjectId);

  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const selectedDeck = decks.find((d) => d.id === selectedDeckId) ?? null;
  const { cards, loading: cardsLoading, updateCard, archiveCard } = useDeckCards(selectedDeckId);

  const [search, setSearch] = useState('');

  const [renamingDeck, setRenamingDeck] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [movingDeck, setMovingDeck] = useState(false);
  const [archivingDeck, setArchivingDeck] = useState(false);
  const [deckError, setDeckError] = useState<string | null>(null);
  const [deckActionBusy, setDeckActionBusy] = useState(false);

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [archivingCardId, setArchivingCardId] = useState<string | null>(null);
  const [cardActionBusy, setCardActionBusy] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  function resetDeckActionState() {
    setRenamingDeck(false);
    setMovingDeck(false);
    setArchivingDeck(false);
    setDeckError(null);
  }

  function resetCardActionState() {
    setEditingCardId(null);
    setArchivingCardId(null);
    setCardError(null);
  }

  function handleSelectDeck(deck: Deck) {
    setSelectedDeckId(deck.id);
    setSearch('');
    resetDeckActionState();
    resetCardActionState();
  }

  function handleBackToList() {
    setSelectedDeckId(null);
    setSearch('');
    resetDeckActionState();
    resetCardActionState();
    // Picks up any card-level archive/edit made while viewing the deck's
    // detail — useDeckCards' own refresh doesn't know about useDecks'
    // cardCounts, so this list would otherwise show a stale count.
    refreshDecks();
  }

  function startRenameDeck() {
    if (!selectedDeck) return;
    setRenameValue(selectedDeck.name);
    setRenamingDeck(true);
    setMovingDeck(false);
    setArchivingDeck(false);
  }

  async function saveRenameDeck() {
    if (!selectedDeck) return;
    if (!renameValue.trim()) {
      setDeckError('Card set name is required.');
      return;
    }
    setDeckActionBusy(true);
    try {
      await renameDeck(selectedDeck.id, renameValue.trim());
      setRenamingDeck(false);
      setDeckError(null);
    } catch (err) {
      setDeckError(err instanceof Error ? err.message : 'Could not rename this card set.');
    } finally {
      setDeckActionBusy(false);
    }
  }

  async function confirmArchiveDeck() {
    if (!selectedDeck) return;
    setDeckActionBusy(true);
    try {
      await archiveDeck(selectedDeck.id);
      handleBackToList();
    } catch (err) {
      setDeckError(err instanceof Error ? err.message : 'Could not archive this card set.');
      setDeckActionBusy(false);
    }
  }

  async function handleMoveDeck(newSubjectId: string) {
    if (!selectedDeck) return;
    setDeckActionBusy(true);
    try {
      await moveDeck(selectedDeck.id, newSubjectId);
      handleBackToList();
    } catch (err) {
      setDeckError(err instanceof Error ? err.message : 'Could not move this card set.');
      setDeckActionBusy(false);
    }
  }

  function startEditCard(card: Flashcard) {
    setEditingCardId(card.id);
    setEditQuestion(card.question_text ?? '');
    setEditAnswer(card.answer_text ?? '');
    setArchivingCardId(null);
    setCardError(null);
  }

  async function confirmArchiveCard(id: string) {
    setCardActionBusy(true);
    try {
      await archiveCard(id);
      setArchivingCardId(null);
    } catch (err) {
      setCardError(err instanceof Error ? err.message : 'Could not archive this card.');
    } finally {
      setCardActionBusy(false);
    }
  }

  if (!activeSubject) {
    return (
      <ScreenContainer>
        <ScreenTitle>View Cards</ScreenTitle>
        <ScreenSubtitle>You need an active subject to view its card sets.</ScreenSubtitle>
        <Banner kind="info">Select or create a subject first, then come back here.</Banner>
        <PrimaryButton title="Manage subjects" onPress={() => router.push('/subjects')} />
      </ScreenContainer>
    );
  }

  const otherSubjects = subjects.filter((s) => s.id !== activeSubjectId);
  const filteredDecks = decks.filter((d) => d.name.toLowerCase().includes(search.trim().toLowerCase()));
  const filteredCards = cards.filter((c) =>
    search.trim() ? (c.question_text ?? '').toLowerCase().includes(search.trim().toLowerCase()) : true
  );

  return (
    <ScreenContainer>
      <ScreenTitle>View Cards</ScreenTitle>
      <ScreenSubtitle>{subjectLabel(activeSubject.name, activeSubject.academic_year)}</ScreenSubtitle>

      {!selectedDeck ? (
        <>
          <FormField
            label="Search"
            value={search}
            onChangeText={setSearch}
            placeholder="Search card sets by name"
          />

          {decksLoading ? (
            <Text style={{ color: colors.muted }}>Loading card sets…</Text>
          ) : decks.length === 0 ? (
            <Banner kind="info">No card sets yet for {activeSubject.name}. Create one from New Card.</Banner>
          ) : filteredDecks.length === 0 ? (
            <Text style={{ color: colors.muted }}>No card sets match &ldquo;{search}&rdquo;.</Text>
          ) : (
            filteredDecks.map((deck) => (
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
        </>
      ) : (
        <>
          <Pressable onPress={handleBackToList}>
            <Text style={{ color: colors.tint, fontWeight: '600', marginBottom: 12 }}>‹ Back to card sets</Text>
          </Pressable>

          {deckError ? <Banner kind="error">{deckError}</Banner> : null}

          <View style={[styles.card, { borderColor: colors.tint, backgroundColor: colors.card }]}>
            {renamingDeck ? (
              <>
                <FormField label="Card set name" value={renameValue} onChangeText={setRenameValue} />
                <View style={styles.actionsRow}>
                  <PrimaryButton title="Save" onPress={saveRenameDeck} loading={deckActionBusy} />
                  <Pressable onPress={() => setRenamingDeck(false)} style={styles.textAction}>
                    <Text style={{ color: colors.muted }}>Cancel</Text>
                  </Pressable>
                </View>
              </>
            ) : movingDeck ? (
              <>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>Move to which subject?</Text>
                {otherSubjects.length === 0 ? (
                  <Text style={{ color: colors.muted }}>You don&apos;t have any other subjects yet.</Text>
                ) : (
                  otherSubjects.map((subject) => (
                    <Pressable
                      key={subject.id}
                      onPress={() => handleMoveDeck(subject.id)}
                      style={[styles.subjectOption, { borderColor: colors.border }]}
                      disabled={deckActionBusy}
                    >
                      <Text style={{ color: colors.text }}>{subjectLabel(subject.name, subject.academic_year)}</Text>
                    </Pressable>
                  ))
                )}
                <Pressable onPress={() => setMovingDeck(false)} style={styles.textAction}>
                  <Text style={{ color: colors.muted }}>Cancel</Text>
                </Pressable>
              </>
            ) : archivingDeck ? (
              <>
                <Text style={{ color: colors.text }}>{ARCHIVE_WARNING} Cards inside stay saved.</Text>
                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={confirmArchiveDeck}
                    style={[styles.confirmButton, { backgroundColor: colors.accent }]}
                  >
                    <Text style={styles.confirmButtonText}>Confirm archive</Text>
                  </Pressable>
                  <Pressable onPress={() => setArchivingDeck(false)} style={styles.textAction}>
                    <Text style={{ color: colors.muted }}>Cancel</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>{selectedDeck.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  {/* cards.length (from useDeckCards, scoped to this deck) rather than
                      cardCounts (from useDecks' list-level fetch) — the latter only
                      updates on a decks refresh, so it goes stale immediately after
                      editing/archiving a card here. Found by testing, not designed in. */}
                  {cards.length} card(s)
                </Text>
                <View style={styles.actionsRow}>
                  <Pressable onPress={startRenameDeck} style={styles.textAction}>
                    <Text style={{ color: colors.tint }}>Rename</Text>
                  </Pressable>
                  <Pressable onPress={() => setMovingDeck(true)} style={styles.textAction}>
                    <Text style={{ color: colors.tint }}>Move</Text>
                  </Pressable>
                  <Pressable onPress={() => setArchivingDeck(true)} style={styles.textAction}>
                    <Text style={{ color: colors.accent }}>Archive</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>

          <FormField
            label="Search cards"
            value={search}
            onChangeText={setSearch}
            placeholder="Search this set's questions"
          />

          {cardError ? <Banner kind="error">{cardError}</Banner> : null}

          {cardsLoading ? (
            <Text style={{ color: colors.muted }}>Loading cards…</Text>
          ) : cards.length === 0 ? (
            <Banner kind="info">No cards in this set yet — add some from New Card.</Banner>
          ) : filteredCards.length === 0 ? (
            <Text style={{ color: colors.muted }}>No cards match &ldquo;{search}&rdquo;.</Text>
          ) : (
            filteredCards.map((card, index) => (
              <CardRow
                key={card.id}
                card={card}
                index={index}
                isEditing={editingCardId === card.id}
                isArchiving={archivingCardId === card.id}
                editQuestion={editQuestion}
                editAnswer={editAnswer}
                onEditQuestionChange={setEditQuestion}
                onEditAnswerChange={setEditAnswer}
                onStartEdit={() => startEditCard(card)}
                onCardUpdated={() => setEditingCardId(null)}
                onCancelEdit={() => setEditingCardId(null)}
                onStartArchive={() => setArchivingCardId(card.id)}
                onConfirmArchive={() => confirmArchiveCard(card.id)}
                onCancelArchive={() => setArchivingCardId(null)}
                updateCard={updateCard}
              />
            ))
          )}
        </>
      )}

      <Pressable onPress={() => router.push('/dashboard')} style={{ marginTop: 16 }}>
        <Text style={{ color: colors.muted, textAlign: 'center' }}>Back to dashboard</Text>
      </Pressable>
    </ScreenContainer>
  );
}

interface CardRowProps {
  card: Flashcard;
  index: number;
  isEditing: boolean;
  isArchiving: boolean;
  editQuestion: string;
  editAnswer: string;
  onEditQuestionChange: (v: string) => void;
  onEditAnswerChange: (v: string) => void;
  onStartEdit: () => void;
  onCardUpdated: () => void;
  onCancelEdit: () => void;
  onStartArchive: () => void;
  onConfirmArchive: () => void;
  onCancelArchive: () => void;
  updateCard: (id: string, question: string, answer: string) => Promise<void>;
}

// Its own component (not inlined in the .map() above) specifically so it can
// call useCardImages(card.id) — one hook instance per row, which the Rules of
// Hooks don't allow inside a loop in the parent directly. Owning its own
// save/validation (instead of the parent, as earlier phases did) follows from
// the same reason: "text or image per side" needs the image counts this row
// already has, which the parent has no way to see across every row at once.
function CardRow({
  card,
  index,
  isEditing,
  isArchiving,
  editQuestion,
  editAnswer,
  onEditQuestionChange,
  onEditAnswerChange,
  onStartEdit,
  onCardUpdated,
  onCancelEdit,
  onStartArchive,
  onConfirmArchive,
  onCancelArchive,
  updateCard,
}: CardRowProps) {
  const colors = useThemeColors();
  const { session } = useAuth();
  const { images, refresh: refreshImages } = useCardImages(card.id);
  const questionImages = images.filter((i) => i.side === 'question');
  const answerImages = images.filter((i) => i.side === 'answer');

  const [imageError, setImageError] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ question?: string; answer?: string }>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSaveEdit() {
    const errors: { question?: string; answer?: string } = {};
    if (!editQuestion.trim() && questionImages.length === 0) {
      errors.question = 'Add question text or at least one question image.';
    }
    if (!editAnswer.trim() && answerImages.length === 0) {
      errors.answer = 'Add answer text or at least one answer image.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setSaveError(null);
    try {
      await updateCard(card.id, editQuestion.trim(), editAnswer.trim());
      onCardUpdated();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save this card.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddImage(side: 'question' | 'answer') {
    if (!session) return;
    const existing = side === 'question' ? questionImages : answerImages;
    const remaining = MAX_IMAGES_PER_SIDE - existing.length;
    if (remaining <= 0) return;

    setImageError(null);
    try {
      const uris = await pickImages(remaining);
      if (uris.length === 0) return;
      setImageBusy(true);
      for (let i = 0; i < uris.length; i++) {
        await uploadCardImage({
          userId: session.user.id,
          flashcardId: card.id,
          side,
          sortOrder: existing.length + i,
          localUri: uris[i],
        });
      }
      await refreshImages();
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Could not add image.');
    } finally {
      setImageBusy(false);
    }
  }

  async function handleRemoveImage(image: CardImageWithUrl) {
    setImageError(null);
    try {
      await deleteCardImage(image);
      await refreshImages();
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Could not remove this image.');
    }
  }

  return (
    <View style={[styles.cardRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
      {isEditing ? (
        <>
          {imageError ? <Banner kind="error">{imageError}</Banner> : null}
          {saveError ? <Banner kind="error">{saveError}</Banner> : null}

          <FormField
            label="Question text"
            value={editQuestion}
            onChangeText={onEditQuestionChange}
            error={fieldErrors.question}
            multiline
          />
          <ImageGallery images={questionImages} label="Question images" variant="thumbnails" onRemove={handleRemoveImage} />
          <Pressable
            onPress={() => handleAddImage('question')}
            disabled={imageBusy || questionImages.length >= MAX_IMAGES_PER_SIDE}
            style={[styles.imageButton, { borderColor: colors.border, opacity: imageBusy ? 0.6 : 1 }]}
          >
            <Text style={{ color: colors.tint, fontSize: 12, fontWeight: '600' }}>
              {questionImages.length >= MAX_IMAGES_PER_SIDE
                ? 'Max 3 images'
                : `+ Add image (${questionImages.length}/${MAX_IMAGES_PER_SIDE})`}
            </Text>
          </Pressable>

          <FormField
            label="Answer text"
            value={editAnswer}
            onChangeText={onEditAnswerChange}
            error={fieldErrors.answer}
            multiline
          />
          <ImageGallery images={answerImages} label="Answer images" variant="thumbnails" onRemove={handleRemoveImage} />
          <Pressable
            onPress={() => handleAddImage('answer')}
            disabled={imageBusy || answerImages.length >= MAX_IMAGES_PER_SIDE}
            style={[styles.imageButton, { borderColor: colors.border, opacity: imageBusy ? 0.6 : 1 }]}
          >
            <Text style={{ color: colors.tint, fontSize: 12, fontWeight: '600' }}>
              {answerImages.length >= MAX_IMAGES_PER_SIDE
                ? 'Max 3 images'
                : `+ Add image (${answerImages.length}/${MAX_IMAGES_PER_SIDE})`}
            </Text>
          </Pressable>

          <View style={styles.actionsRow}>
            <PrimaryButton title="Save" onPress={handleSaveEdit} loading={saving} />
            <Pressable onPress={onCancelEdit} style={styles.textAction}>
              <Text style={{ color: colors.muted }}>Cancel</Text>
            </Pressable>
          </View>
        </>
      ) : isArchiving ? (
        <>
          <Text style={{ color: colors.text }}>{ARCHIVE_WARNING}</Text>
          <View style={styles.actionsRow}>
            <Pressable onPress={onConfirmArchive} style={[styles.confirmButton, { backgroundColor: colors.accent }]}>
              <Text style={styles.confirmButtonText}>Confirm archive</Text>
            </Pressable>
            <Pressable onPress={onCancelArchive} style={styles.textAction}>
              <Text style={{ color: colors.muted }}>Cancel</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Text style={[styles.cardIndex, { color: colors.muted }]}>Card {index + 1}</Text>
          {card.question_text ? <Text style={{ color: colors.text, fontWeight: '600' }}>{card.question_text}</Text> : null}
          <ImageGallery images={questionImages} label="Question images" variant="thumbnails" />
          {card.answer_text ? <Text style={{ color: colors.muted, marginTop: 4 }}>{card.answer_text}</Text> : null}
          <ImageGallery images={answerImages} label="Answer images" variant="thumbnails" />
          <View style={styles.actionsRow}>
            <Pressable onPress={onStartEdit} style={styles.textAction}>
              <Text style={{ color: colors.tint }}>Edit</Text>
            </Pressable>
            <Pressable onPress={onStartArchive} style={styles.textAction}>
              <Text style={{ color: colors.accent }}>Archive</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
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
    gap: 8,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },
  textAction: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  confirmButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  subjectOption: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  cardRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  cardIndex: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  imageButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: -4,
  },
});
