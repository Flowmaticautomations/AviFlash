import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Banner, PrimaryButton, ScreenContainer, ScreenSubtitle, ScreenTitle } from '../components/ui';
import { useThemeColors } from '../hooks/useThemeColors';
import { useActiveSubject } from '../hooks/useActiveSubject';
import { useSubjects } from '../hooks/useSubjects';
import { useAuth } from '../lib/auth';

const ACTIONS: { label: string; href: '/new-card' | '/view-cards' | '/review' | '/settings' }[] = [
  { label: 'New Card', href: '/new-card' },
  { label: 'View Cards', href: '/view-cards' },
  { label: 'Review', href: '/review' },
  { label: 'Settings', href: '/settings' },
];

export default function Dashboard() {
  const colors = useThemeColors();
  const router = useRouter();
  const { profile, subscription } = useAuth();
  const { subjects, loading } = useSubjects();
  const { activeSubjectId, setActiveSubjectId, loaded: activeSubjectLoaded } = useActiveSubject();

  const currentSubject = subjects.find((s) => s.id === activeSubjectId) ?? subjects[0] ?? null;

  useEffect(() => {
    if (activeSubjectLoaded && !activeSubjectId && subjects.length > 0) {
      setActiveSubjectId(subjects[0].id);
    }
  }, [activeSubjectLoaded, activeSubjectId, subjects, setActiveSubjectId]);

  return (
    <ScreenContainer>
      <ScreenTitle>Hi{profile?.first_name ? `, ${profile.first_name}` : ''}</ScreenTitle>
      <ScreenSubtitle>Pick a subject, then use the tools below.</ScreenSubtitle>

      {subscription?.status === 'trialing' ? (
        <Banner kind="info">
          Trial active until {new Date(subscription.trial_ends_at).toLocaleDateString()}.
        </Banner>
      ) : subscription?.status === 'active' && subscription.paid_until ? (
        <Banner kind="info">
          Active until {new Date(subscription.paid_until).toLocaleDateString()}.
        </Banner>
      ) : null}

      {!loading && subjects.length === 0 ? (
        <View style={[styles.subjectCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.subjectLabel, { color: colors.muted }]}>No subject selected</Text>
          <PrimaryButton title="Add your first subject" onPress={() => router.push('/subjects')} />
        </View>
      ) : (
        <Pressable
          onPress={() => router.push('/subjects')}
          style={[styles.subjectCard, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Text style={[styles.subjectLabel, { color: colors.muted }]}>Subject</Text>
          <Text style={[styles.subjectName, { color: colors.text }]}>
            {currentSubject ? currentSubject.name : 'Loading…'}
          </Text>
          <Text style={[styles.subjectChange, { color: colors.tint }]}>Change or manage subjects</Text>
        </Pressable>
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
  subjectName: {
    fontSize: 20,
    fontWeight: '700',
  },
  subjectChange: {
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
});
