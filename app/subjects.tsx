import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Banner, FormField, PrimaryButton, ScreenContainer, ScreenSubtitle, ScreenTitle } from '../components/ui';
import { useThemeColors } from '../hooks/useThemeColors';
import { useActiveSubject } from '../hooks/useActiveSubject';
import { Subject, useSubjects } from '../hooks/useSubjects';

function subjectLabel(subject: Subject) {
  return subject.name;
}

export default function Subjects() {
  const colors = useThemeColors();
  const router = useRouter();
  const { subjects, loading, createSubject, renameSubject, archiveSubject } = useSubjects();
  const { activeSubjectId, setActiveSubjectId } = useActiveSubject();

  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const [archivingId, setArchivingId] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    if (!newName.trim()) {
      setError('Subject name is required.');
      return;
    }
    setCreating(true);
    try {
      const created = await createSubject(newName.trim());
      if (created && !activeSubjectId) setActiveSubjectId(created.id);
      setNewName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create subject.');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(subject: Subject) {
    setEditingId(subject.id);
    setEditName(subject.name);
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await renameSubject(id, editName.trim());
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(id: string) {
    await archiveSubject(id);
    if (activeSubjectId === id) setActiveSubjectId(null);
    setArchivingId(null);
  }

  return (
    <ScreenContainer>
      <ScreenTitle>Subjects</ScreenTitle>
      <ScreenSubtitle>Tap a subject to make it active.</ScreenSubtitle>

      {error ? <Banner kind="error">{error}</Banner> : null}

      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.cardHeading, { color: colors.text }]}>Add a subject</Text>
        <FormField label="Name" value={newName} onChangeText={setNewName} placeholder="e.g. Mathematics - 2026" />
        <PrimaryButton title="Add subject" onPress={handleCreate} loading={creating} />
      </View>

      {loading ? (
        <Text style={{ color: colors.muted, marginTop: 12 }}>Loading subjects…</Text>
      ) : subjects.length === 0 ? (
        <Text style={{ color: colors.muted, marginTop: 12 }}>No subjects yet — add your first one above.</Text>
      ) : (
        subjects.map((subject) => {
          const isActive = subject.id === activeSubjectId;
          const isEditing = editingId === subject.id;
          const isArchiving = archivingId === subject.id;

          return (
            <View
              key={subject.id}
              style={[
                styles.row,
                { borderColor: isActive ? colors.tint : colors.border, backgroundColor: colors.card },
              ]}
            >
              {isEditing ? (
                <View style={{ gap: 8, flex: 1 }}>
                  <FormField label="Name" value={editName} onChangeText={setEditName} />
                  <View style={styles.rowActions}>
                    <PrimaryButton title="Save" onPress={() => handleSaveEdit(subject.id)} loading={saving} />
                    <Pressable onPress={() => setEditingId(null)} style={styles.textAction}>
                      <Text style={{ color: colors.muted }}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : isArchiving ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ color: colors.text }}>
                    Archive &ldquo;{subjectLabel(subject)}&rdquo;? It will be hidden from your subject list; its
                    decks and cards stay saved.
                  </Text>
                  <View style={styles.rowActions}>
                    <Pressable
                      onPress={() => handleArchive(subject.id)}
                      style={[styles.confirmButton, { backgroundColor: colors.accent }]}
                    >
                      <Text style={styles.confirmButtonText}>Confirm archive</Text>
                    </Pressable>
                    <Pressable onPress={() => setArchivingId(null)} style={styles.textAction}>
                      <Text style={{ color: colors.muted }}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  <Pressable style={styles.rowTitleWrap} onPress={() => setActiveSubjectId(subject.id)}>
                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={2}>
                      {isActive ? '✓ ' : ''}
                      {subjectLabel(subject)}
                    </Text>
                  </Pressable>
                  <View style={styles.rowActions}>
                    <Pressable
                      onPress={() => startEdit(subject)}
                      style={[styles.actionChip, { borderColor: colors.tint }]}
                    >
                      <Text style={[styles.actionChipText, { color: colors.tint }]}>Edit</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setArchivingId(subject.id)}
                      style={[styles.actionChip, { borderColor: colors.accent }]}
                    >
                      <Text style={[styles.actionChipText, { color: colors.accent }]}>Archive</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          );
        })
      )}

      <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
        <Text style={{ color: colors.tint, textAlign: 'center', fontWeight: '600' }}>Back to Dashboard</Text>
      </Pressable>
    </ScreenContainer>
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
  cardHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    rowGap: 8,
  },
  rowTitleWrap: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: '55%',
    marginRight: 8,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    flexShrink: 0,
    columnGap: 10,
    rowGap: 8,
  },
  textAction: {
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  actionChip: {
    flexShrink: 0,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  actionChipText: {
    flexShrink: 0,
    fontWeight: '600',
    fontSize: 13,
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
});
