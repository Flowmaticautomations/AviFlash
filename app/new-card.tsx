import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Banner, FormField, PrimaryButton, ScreenContainer, ScreenSubtitle, ScreenTitle, SecondaryButton } from '../components/ui';
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

function subjectLabel(name: string) {
  return name;
}

function blankCard() {
  return { question: '', answer: '', questionImages: [] as StagedImage[], answerImages: [] as StagedImage[] };
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

  const [card, setCard] = useState(blankCard());
  const [fieldErrors, setFieldErrors] = useState<{ question?: string; answer?: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  // Which button triggered the in-flight save, so only that one shows its
  // spinner -- both are disabled either way, so this can't produce a
  // duplicate save, it's purely which label shows "..." while saving.
  const [saving, setSaving] = useState<'save' | 'addAnother' | null>(null);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [confirmingLeave, setConfirmingLeave] = useState(false);

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
    setCard(blankCard());
    setFieldErrors({});
    await resolveExistingCardCount(deck.id);
  }

  async function handleCreateDeck() {
    setDeckError(null);
    if (!newDeckName.trim()) {
      setDeckError('Deck name is required.');
      return;
    }
    setCreatingDeck(true);
    try {
      const deck = await createDeck(newDeckName.trim());
      setNewDeckName('');
      if (deck) await handleSelectDeck(deck);
    } catch (err) {
      setDeckError(err instanceof Error ? err.message : 'Could not create the deck.');
    } finally {
      setCreatingDeck(false);
    }
  }

  async function addImages(side: 'question' | 'answer') {
    const field = side === 'question' ? 'questionImages' : 'answerImages';
    const remainingSlots = MAX_IMAGES_PER_SIDE - card[field].length;
    if (remainingSlots <= 0) return;

    try {
      const uris = await pickImages(remainingSlots);
      if (uris.length === 0) return;
      const newImages: StagedImage[] = uris.map((uri, i) => ({ key: `img-${side}-${Date.now()}-${i}`, uri }));
      setCard((prev) => ({ ...prev, [field]: [...prev[field], ...newImages] }));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not open the photo picker.');
    }
  }

  function removeStagedImage(side: 'question' | 'answer', imageKey: string) {
    const field = side === 'question' ? 'questionImages' : 'answerImages';
    setCard((prev) => ({ ...prev, [field]: prev[field].filter((img) => img.key !== imageKey) }));
  }

  function validateCard(): boolean {
    const errors: { question?: string; answer?: string } = {};
    if (!card.question.trim() && card.questionImages.length === 0) {
      errors.question = 'Add question text or at least one question image.';
    }
    if (!card.answer.trim() && card.answerImages.length === 0) {
      errors.answer = 'Add answer text or at least one answer image.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave(addAnother: boolean) {
    setSaveError(null);
    setSavedBanner(null);
    if (!selectedDeck || !session || saving) return;
    if (!validateCard()) {
      setSaveError('Fix the highlighted fields before saving.');
      return;
    }

    setSaving(addAnother ? 'addAnother' : 'save');
    const { data: inserted, error } = await supabase
      .from('flashcards')
      .insert({
        user_id: session.user.id,
        deck_id: selectedDeck.id,
        question_text: card.question.trim() || null,
        answer_text: card.answer.trim() || null,
        card_order: deckCardCount,
      })
      .select()
      .single();

    if (error || !inserted) {
      setSaving(null);
      setSaveError(error?.message ?? 'Could not save this card.');
      return;
    }

    // The card itself is saved at this point regardless of what happens next
    // -- image upload failures are reported but never roll back the
    // already-created flashcard row or its text.
    let imageFailures = 0;
    const sides: { images: StagedImage[]; side: 'question' | 'answer' }[] = [
      { images: card.questionImages, side: 'question' },
      { images: card.answerImages, side: 'answer' },
    ];
    for (const { images, side } of sides) {
      for (let sortOrder = 0; sortOrder < images.length; sortOrder++) {
        try {
          await uploadCardImage({
            userId: session.user.id,
            flashcardId: inserted.id,
            side,
            sortOrder,
            localUri: images[sortOrder].uri,
          });
        } catch {
          imageFailures += 1;
        }
      }
    }

    setSaving(null);
    setDeckCardCount((prev) => prev + 1);
    setSavedBanner(
      imageFailures > 0
        ? `Card saved. ${imageFailures} image${imageFailures === 1 ? '' : 's'} failed to upload — you can add ${imageFailures === 1 ? 'it' : 'them'} again from Manage Cards.`
        : 'Card saved.'
    );
    setCard(blankCard());
    setFieldErrors({});
    if (!addAnother) {
      // Nothing left to accidentally re-save -- the form is already blank.
      // Leaving the user here (rather than forcing a navigate-away) matches
      // "Back to Dashboard" being its own separate, explicit button.
    }
  }

  function hasUnsavedWork() {
    return card.question.trim() || card.answer.trim() || card.questionImages.length > 0 || card.answerImages.length > 0;
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
        <ScreenSubtitle>You need an active subject before you can create a deck.</ScreenSubtitle>
        <Banner kind="info">Select or create a subject first, then come back here.</Banner>
        <PrimaryButton title="Manage Subjects" onPress={() => router.push('/subjects')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenTitle>New Card</ScreenTitle>
      <ScreenSubtitle>{subjectLabel(activeSubject.name)} — build a deck, then add cards.</ScreenSubtitle>

      {confirmingLeave ? <Banner kind="error">You have unsaved card text. Leaving now will lose it.</Banner> : null}

      {!selectedDeck ? (
        <>
          {deckError ? <Banner kind="error">{deckError}</Banner> : null}

          {decksLoading ? (
            <Text style={{ color: colors.muted }}>Loading decks…</Text>
          ) : decks.length > 0 ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>Add to an existing deck</Text>
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
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Create a new deck</Text>
            <FormField
              label="Deck name"
              value={newDeckName}
              onChangeText={setNewDeckName}
              placeholder="e.g. Chapter 3 — Rivers"
            />
            <PrimaryButton title="Use this deck" onPress={handleCreateDeck} loading={creatingDeck} />
          </View>
        </>
      ) : (
        <>
          <Text style={[styles.deckName, { color: colors.text }]}>{selectedDeck.name}</Text>

          {savedBanner ? <Banner kind="success">{savedBanner}</Banner> : null}
          {saveError ? <Banner kind="error">{saveError}</Banner> : null}

          <View style={[styles.cardForm, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Question</Text>
            <FormField
              label=""
              value={card.question}
              onChangeText={(v) => setCard((prev) => ({ ...prev, question: v }))}
              error={fieldErrors.question}
              multiline
            />
            <StagedImageRow
              images={card.questionImages}
              onAdd={() => addImages('question')}
              onRemove={(imgKey) => removeStagedImage('question', imgKey)}
            />

            <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 8 }]}>Answer</Text>
            <FormField
              label=""
              value={card.answer}
              onChangeText={(v) => setCard((prev) => ({ ...prev, answer: v }))}
              error={fieldErrors.answer}
              multiline
            />
            <StagedImageRow
              images={card.answerImages}
              onAdd={() => addImages('answer')}
              onRemove={(imgKey) => removeStagedImage('answer', imgKey)}
            />
          </View>

          <PrimaryButton title="Save" onPress={() => handleSave(false)} loading={saving === 'save'} disabled={saving === 'addAnother'} />
          <View style={{ marginTop: 10 }}>
            <SecondaryButton
              title="Save and Add Another"
              onPress={() => handleSave(true)}
              disabled={saving !== null}
            />
          </View>

          <Pressable onPress={() => guardedNavigate('/dashboard')} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.muted, textAlign: 'center' }}>
              {confirmingLeave ? 'Tap again to leave without saving' : 'Back to Dashboard'}
            </Text>
          </Pressable>
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
          {full ? 'Max 3 images' : `+ Image (${images.length}/${MAX_IMAGES_PER_SIDE})`}
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
  deckName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  cardForm: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 4,
  },
  fieldLabel: {
    fontSize: 15,
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
});
