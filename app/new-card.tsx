import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Banner, FormField, PrimaryButton, ScreenContainer, ScreenSubtitle, ScreenTitle } from '../components/ui';
import { useThemeColors } from '../hooks/useThemeColors';
import { useActiveSubject } from '../hooks/useActiveSubject';
import { Deck, useDecks } from '../hooks/useDecks';
import { useSubjects } from '../hooks/useSubjects';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { MAX_IMAGES_PER_SIDE, pickImages, uploadCardImage } from '../lib/imageUpload';

interface StagedImage {
  key: string;
  uri: string;
}

interface PendingCard {
  key: string;
  question: string;
  answer: string;
  questionImages: StagedImage[];
  answerImages: StagedImage[];
}

function subjectLabel(name: string) {
  return name;
}

export default function NewCard() {
  const colors = useThemeColors();
  const router = useRouter();
  const { session } = useAuth();
  const { subjects } = useSubjects();
  const { activeSubjectId } = useActiveSubject();
  const activeSubject = subjects.find((s) => s.id === activeSubjectId) ?? null;

  const { decks, loading: decksLoading, createDeck } = useDecks(activeSubjectId);

  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [deckCardCount, setDeckCardCount] = useState(0);
  const [newDeckName, setNewDeckName] = useState('');
  const [deckError, setDeckError] = useState<string | null>(null);
  const [creatingDeck, setCreatingDeck] = useState(false);

  const nextKey = useRef(0);
  const [pendingCards, setPendingCards] = useState<PendingCard[]>([]);
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [confirmingLeave, setConfirmingLeave] = useState(false);

  function addBlankCard() {
    const key = `card-${nextKey.current++}`;
    setPendingCards((prev) => [...prev, { key, question: '', answer: '', questionImages: [], answerImages: [] }]);
  }

  async function addImagesToCard(cardKey: string, side: 'question' | 'answer') {
    const card = pendingCards.find((c) => c.key === cardKey);
    if (!card) return;
    const field = side === 'question' ? 'questionImages' : 'answerImages';
    const remainingSlots = MAX_IMAGES_PER_SIDE - card[field].length;
    if (remainingSlots <= 0) return;

    try {
      const uris = await pickImages(remainingSlots);
      if (uris.length === 0) return;
      const newImages: StagedImage[] = uris.map((uri, i) => ({ key: `img-${cardKey}-${side}-${Date.now()}-${i}`, uri }));
      setPendingCards((prev) =>
        prev.map((c) => (c.key === cardKey ? { ...c, [field]: [...c[field], ...newImages] } : c))
      );
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not open the photo picker.');
    }
  }

  function removeStagedImage(cardKey: string, side: 'question' | 'answer', imageKey: string) {
    const field = side === 'question' ? 'questionImages' : 'answerImages';
    setPendingCards((prev) =>
      prev.map((c) => (c.key === cardKey ? { ...c, [field]: c[field].filter((img) => img.key !== imageKey) } : c))
    );
  }

  async function resolveExistingCardCount(deckId: string) {
    const { count } = await supabase
      .from('flashcards')
      .select('id', { count: 'exact', head: true })
      .eq('deck_id', deckId);
    setDeckCardCount(count ?? 0);
  }

  async function handleSelectDeck(deck: Deck) {
    setSavedBanner(null);
    setSelectedDeck(deck);
    setPendingCards([]);
    await resolveExistingCardCount(deck.id);
    addBlankCard();
  }

  async function handleCreateDeck() {
    setDeckError(null);
    if (!newDeckName.trim()) {
      setDeckError('Card set name is required.');
      return;
    }
    setCreatingDeck(true);
    try {
      const deck = await createDeck(newDeckName.trim());
      setNewDeckName('');
      if (deck) await handleSelectDeck(deck);
    } catch (err) {
      setDeckError(err instanceof Error ? err.message : 'Could not create the card set.');
    } finally {
      setCreatingDeck(false);
    }
  }

  function updateCard(key: string, field: 'question' | 'answer', value: string) {
    setPendingCards((prev) => prev.map((c) => (c.key === key ? { ...c, [field]: value } : c)));
  }

  function removeCard(key: string) {
    setPendingCards((prev) => prev.filter((c) => c.key !== key));
  }

  function validateCards(): boolean {
    const errors: Record<string, string> = {};
    for (const card of pendingCards) {
      if (!card.question.trim() && card.questionImages.length === 0) {
        errors[`${card.key}-question`] = 'Add question text or at least one question image.';
      }
      if (!card.answer.trim() && card.answerImages.length === 0) {
        errors[`${card.key}-answer`] = 'Add answer text or at least one answer image.';
      }
    }
    setCardErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    setSaveError(null);
    setSavedBanner(null);
    if (!selectedDeck || !session) return;
    if (pendingCards.length === 0) {
      setSaveError('Add at least one card before saving.');
      return;
    }
    if (!validateCards()) {
      setSaveError('Fix the highlighted fields before saving.');
      return;
    }

    setSaving(true);
    const rows = pendingCards.map((card, index) => ({
      user_id: session.user.id,
      deck_id: selectedDeck.id,
      question_text: card.question.trim() || null,
      answer_text: card.answer.trim() || null,
      card_order: deckCardCount + index,
    }));

    const { data: insertedCards, error } = await supabase.from('flashcards').insert(rows).select();

    if (error || !insertedCards) {
      setSaving(false);
      setSaveError(error?.message ?? 'Could not save these cards.');
      return;
    }

    // Cards themselves are saved at this point regardless of what happens
    // next — image upload failures are reported but never roll back the
    // already-created flashcard rows or their text.
    let imageFailures = 0;
    for (let i = 0; i < insertedCards.length; i++) {
      const flashcardId = insertedCards[i].id;
      const card = pendingCards[i];
      const sides: { images: StagedImage[]; side: 'question' | 'answer' }[] = [
        { images: card.questionImages, side: 'question' },
        { images: card.answerImages, side: 'answer' },
      ];
      for (const { images, side } of sides) {
        for (let sortOrder = 0; sortOrder < images.length; sortOrder++) {
          try {
            await uploadCardImage({
              userId: session.user.id,
              flashcardId,
              side,
              sortOrder,
              localUri: images[sortOrder].uri,
            });
          } catch {
            imageFailures += 1;
          }
        }
      }
    }

    setSaving(false);
    setDeckCardCount((prev) => prev + rows.length);
    const baseMessage = `Saved ${rows.length} card${rows.length === 1 ? '' : 's'} to ${selectedDeck.name}.`;
    setSavedBanner(
      imageFailures > 0
        ? `${baseMessage} ${imageFailures} image${imageFailures === 1 ? '' : 's'} failed to upload — you can add ${imageFailures === 1 ? 'it' : 'them'} again from View Cards.`
        : baseMessage
    );
    setPendingCards([]);
    setCardErrors({});
  }

  function hasUnsavedWork() {
    return pendingCards.some(
      (c) => c.question.trim() || c.answer.trim() || c.questionImages.length > 0 || c.answerImages.length > 0
    );
  }

  function guardedNavigate(to: '/dashboard' | '/subjects' | '/view-cards') {
    if (hasUnsavedWork() && !confirmingLeave) {
      setConfirmingLeave(true);
      return;
    }
    setConfirmingLeave(false);
    router.push(to);
  }

  if (!activeSubject) {
    return (
      <ScreenContainer>
        <ScreenTitle>New Card</ScreenTitle>
        <ScreenSubtitle>You need an active subject before you can create a card set.</ScreenSubtitle>
        <Banner kind="info">Select or create a subject first, then come back here.</Banner>
        <PrimaryButton title="Manage subjects" onPress={() => router.push('/subjects')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenTitle>New Card</ScreenTitle>
      <ScreenSubtitle>
        {subjectLabel(activeSubject.name)} — build a card set, then add cards.
      </ScreenSubtitle>

      {confirmingLeave ? (
        <Banner kind="error">
          You have unsaved card text. Leaving now will lose it.
        </Banner>
      ) : null}

      {!selectedDeck ? (
        <>
          {deckError ? <Banner kind="error">{deckError}</Banner> : null}

          {decksLoading ? (
            <Text style={{ color: colors.muted }}>Loading card sets…</Text>
          ) : decks.length > 0 ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>Add to an existing card set</Text>
              {decks.map((deck) => (
                <Pressable
                  key={deck.id}
                  onPress={() => handleSelectDeck(deck)}
                  style={[styles.deckRow, { borderColor: colors.border, backgroundColor: colors.card }]}
                >
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{deck.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Create a new card set</Text>
            <FormField
              label="Card set name"
              value={newDeckName}
              onChangeText={setNewDeckName}
              placeholder="e.g. Chapter 3 — Rivers"
            />
            <PrimaryButton title="Use this card set" onPress={handleCreateDeck} loading={creatingDeck} />
          </View>
        </>
      ) : (
        <>
          <View style={[styles.card, { borderColor: colors.tint, backgroundColor: colors.card }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Card set: {selectedDeck.name}</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>{deckCardCount} card(s) saved so far.</Text>
          </View>

          {savedBanner ? <Banner kind="success">{savedBanner}</Banner> : null}
          {saveError ? <Banner kind="error">{saveError}</Banner> : null}

          {pendingCards.map((card, index) => (
            <View key={card.key} style={[styles.cardRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <View style={styles.cardRowHeader}>
                <Text style={[styles.cardRowTitle, { color: colors.text }]}>Card {index + 1}</Text>
                {pendingCards.length > 1 ? (
                  <Pressable onPress={() => removeCard(card.key)}>
                    <Text style={{ color: colors.accent, fontSize: 13 }}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>

              <FormField
                label="Question text"
                value={card.question}
                onChangeText={(v) => updateCard(card.key, 'question', v)}
                error={cardErrors[`${card.key}-question`]}
                multiline
              />
              <StagedImageRow
                images={card.questionImages}
                onAdd={() => addImagesToCard(card.key, 'question')}
                onRemove={(imgKey) => removeStagedImage(card.key, 'question', imgKey)}
              />

              <FormField
                label="Answer text"
                value={card.answer}
                onChangeText={(v) => updateCard(card.key, 'answer', v)}
                error={cardErrors[`${card.key}-answer`]}
                multiline
              />
              <StagedImageRow
                images={card.answerImages}
                onAdd={() => addImagesToCard(card.key, 'answer')}
                onRemove={(imgKey) => removeStagedImage(card.key, 'answer', imgKey)}
              />
            </View>
          ))}

          <Pressable onPress={addBlankCard} style={[styles.addCardButton, { borderColor: colors.tint }]}>
            <Text style={{ color: colors.tint, fontWeight: '600' }}>+ Add another card</Text>
          </Pressable>

          {pendingCards.length > 0 ? (
            <PrimaryButton title="Save cards" onPress={handleSave} loading={saving} />
          ) : null}

          {savedBanner ? (
            <View style={{ gap: 10, marginTop: 8 }}>
              <PrimaryButton title="Add another card" onPress={addBlankCard} />
              <Pressable onPress={() => guardedNavigate('/view-cards')} style={styles.textLinkButton}>
                <Text style={{ color: colors.tint, fontWeight: '600' }}>Go to View Cards</Text>
              </Pressable>
              <Pressable onPress={() => guardedNavigate('/dashboard')} style={styles.textLinkButton}>
                <Text style={{ color: colors.tint, fontWeight: '600' }}>Return to Dashboard</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => guardedNavigate('/dashboard')} style={{ marginTop: 16 }}>
              <Text style={{ color: colors.muted, textAlign: 'center' }}>
                {confirmingLeave ? 'Tap again to leave without saving' : 'Cancel and return to dashboard'}
              </Text>
            </Pressable>
          )}
        </>
      )}
    </ScreenContainer>
  );
}

function StagedImageRow({
  images,
  onAdd,
  onRemove,
}: {
  images: StagedImage[];
  onAdd: () => void;
  onRemove: (key: string) => void;
}) {
  const colors = useThemeColors();
  const full = images.length >= MAX_IMAGES_PER_SIDE;

  return (
    <View style={styles.stagedRow}>
      {images.map((img) => (
        <View key={img.key} style={styles.stagedThumbWrap}>
          <Image source={{ uri: img.uri }} style={[styles.stagedThumb, { borderColor: colors.border }]} />
          <Pressable onPress={() => onRemove(img.key)} style={[styles.removeBadge, { backgroundColor: colors.accent }]}>
            <Text style={styles.removeBadgeText}>×</Text>
          </Pressable>
        </View>
      ))}
      <Pressable
        onPress={onAdd}
        disabled={full}
        style={[styles.imageButton, { borderColor: colors.border, opacity: full ? 0.5 : 1 }]}
      >
        <Text style={{ color: full ? colors.muted : colors.tint, fontSize: 12, fontWeight: '600' }}>
          {full ? 'Max 3 images' : `+ Add image (${images.length}/${MAX_IMAGES_PER_SIDE})`}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  deckRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  cardRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  cardRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardRowTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  imageButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stagedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginTop: -4,
    marginBottom: 4,
  },
  stagedThumbWrap: {
    position: 'relative',
  },
  stagedThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
  },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 15,
  },
  addCardButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  textLinkButton: {
    paddingVertical: 6,
    alignItems: 'center',
  },
});
