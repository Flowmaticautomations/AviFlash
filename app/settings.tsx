import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer, ScreenSubtitle, ScreenTitle, SecondaryButton } from '../components/ui';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAuth } from '../lib/auth';

function InfoRow({ label, value }: { label: string; value: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value || '—'}</Text>
    </View>
  );
}

export default function Settings() {
  const colors = useThemeColors();
  const router = useRouter();
  const { profile, signOut } = useAuth();

  return (
    <ScreenContainer>
      <ScreenTitle>Settings</ScreenTitle>
      <ScreenSubtitle>Your account details and quick links.</ScreenSubtitle>

      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.cardHeading, { color: colors.text }]}>Account</Text>
        <InfoRow label="Name" value={[profile?.first_name, profile?.surname].filter(Boolean).join(' ')} />
        <InfoRow label="Email" value={profile?.email ?? ''} />
        <InfoRow label="Phone" value={profile?.phone ?? ''} />
        <InfoRow label="Grade / year" value={profile?.grade_or_year ?? ''} />
        <InfoRow label="Country" value={profile?.country ?? ''} />
      </View>

      <SecondaryButton title="Manage subjects" onPress={() => router.push('/subjects')} />
      <SecondaryButton title="Log out" onPress={() => signOut()} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
  },
});
