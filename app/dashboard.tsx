import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton, ScreenContainer } from '../components/ui';
import { Tutorial } from '../components/Tutorial';
import { useThemeColors } from '../hooks/useThemeColors';
import { useActiveSubject } from '../hooks/useActiveSubject';
import { useDecks } from '../hooks/useDecks';
import { useSubjects } from '../hooks/useSubjects';
import { useTutorial } from '../hooks/useTutorial';
import { useAuth } from '../lib/auth';
import { formatLongDate } from '../lib/formatDate';

const ACTIONS: { label: string; href: '/new-card' | '/view-cards' | '/review' | '/settings' }[] = [
  { label: 'New Card', href: '/new-card' },
  { label: 'Manage Cards', href: '/view-cards' },
  { label: 'Review', href: '/review' },
  { label: 'Settings', href: '/settings' },
];

export default function Dashboard() {
  const colors = useThemeColors();
  const router = useRouter();
  const { profile, subscription } = useAuth();
  const { subjects, loading } = useSubjects();
  const { activeSubjectId, setActiveSubjectId, loaded: activeSubjectLoaded } = useActiveSubject();
  const { showTutorial, dismiss: dismissTutorial } = useTutorial();

  const currentSubject = subjects.find((s) => s.id === activeSubjectId) ?? subjects[0] ?? null;
  const { cardCounts } = useDecks(currentSubject?.id ?? null);
  const activeSubjectCardCount = useMemo(
    () => Object.values(cardCounts).reduce((sum, n) => sum + n, 0),
    [cardCounts]
  );

  const sortedSubjects = useMemo(
    () => [...subjects].sort((a, b) => a.name.localeCompare(b.name)),
    [subjects]
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (activeSubjectLoaded && !activeSubjectId && subjects.length > 0) {
      setActiveSubjectId(subjects[0].id);
    }
  }, [activeSubjectLoaded, activeSubjectId, subjects, setActiveSubjectId]);

  if (showTutorial) {
    return <Tutorial onDone={dismissTutorial} />;
  }

  const trialText =
    subscription?.status === 'trialing'
      ? `Trial expires on ${formatLongDate(subscription.trial_ends_at)}`
      : subscription?.status === 'active' && subscription.paid_until
        ? `Active until ${formatLongDate(subscription.paid_until)}`
        : null;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.text }]}>
          Hi{profile?.first_name ? `, ${profile.first_name}` : ''}
        </Text>
        {trialText ? <Text style={[styles.trialText, { color: colors.muted }]}>{trialText}</Text> : null}
      </View>

      <Text style={[styles.subtitle, { color: colors.muted }]}>Select a Subject, then use tools</Text>

      {!loading && subjects.length === 0 ? (
        <View style={[styles.subjectCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.subjectLabel, { color: colors.muted }]}>No subject selected</Text>
          <PrimaryButton title="Add your first subject" onPress={() => router.push('/subjects')} />
        </View>
      ) : (
        <View style={[styles.subjectCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Pressable onPress={() => setPickerOpen(true)} style={styles.subjectNameRow}>
            <Text style={[styles.subjectName, { color: colors.text }]}>
              {currentSubject ? currentSubject.name : 'Loading…'}
            </Text>
            <Text style={[styles.subjectCount, { color: colors.muted }]}>({activeSubjectCardCount})</Text>
            <Text style={[styles.chevron, { color: colors.tint }]}>▾</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/subjects')}>
            <Text style={[styles.manageLink, { color: colors.tint }]}>Manage Subjects</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.grid}>
        {ACTIONS.map(({ label, href }) => (
          <Pressable
            key={label}
            onPress={() => router.push(href)}
            style={[styles.tile, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <Text style={[styles.tileText, { color: colors.text }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={[styles.pickerCard, { backgroundColor: colors.background }]} onPress={() => {}}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Choose a subject</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {sortedSubjects.map((subject) => (
                <Pressable
                  key={subject.id}
                  onPress={() => {
                    setActiveSubjectId(subject.id);
                    setPickerOpen(false);
                  }}
                  style={[
                    styles.pickerRow,
                    {
                      borderColor: subject.id === currentSubject?.id ? colors.tint : colors.border,
                      backgroundColor: colors.card,
                    },
                  ]}
                >
                  <Text style={{ color: colors.text, fontWeight: '600' }}>
                    {subject.id === currentSubject?.id ? '✓ ' : ''}
                    {subject.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setPickerOpen(false)} style={{ marginTop: 8 }}>
              <Text style={{ color: colors.muted, textAlign: 'center', fontWeight: '600' }}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 12,
    gap: 4,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
  },
  trialText: {
    fontSize: 13,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  subjectCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    gap: 8,
  },
  subjectLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  subjectNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  subjectName: {
    fontSize: 20,
    fontWeight: '700',
  },
  subjectCount: {
    fontSize: 15,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 16,
    fontWeight: '700',
  },
  manageLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 12,
  },
  tile: {
    width: '47%',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    fontSize: 15,
    fontWeight: '600',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pickerCard: {
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 420,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  pickerRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
});
