import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer, ScreenSubtitle, ScreenTitle, SecondaryButton } from '../components/ui';
import { THEME_LABELS, THEME_NAMES } from '../constants/theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../lib/auth';

// Label above value, not side-by-side -- a side-by-side row with no width
// limit on the value clips long content (a real email address in
// particular has no natural break point, so it just ran off the edge of
// the card instead of wrapping).
function InfoRow({ label, value }: { label: string; value: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]} selectable>
        {value || '—'}
      </Text>
    </View>
  );
}

export default function Settings() {
  const colors = useThemeColors();
  const { themeName, setThemeName } = useTheme();
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
        <InfoRow label="Country" value={profile?.country ?? ''} />
      </View>

      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.cardHeading, { color: colors.text }]}>Theme</Text>
        <View style={styles.themeRow}>
          {THEME_NAMES.map((name) => (
            <Pressable
              key={name}
              onPress={() => setThemeName(name)}
              style={[
                styles.themeChip,
                {
                  borderColor: name === themeName ? colors.tint : colors.border,
                  borderWidth: name === themeName ? 2 : 1,
                },
              ]}
            >
              <Text style={{ color: colors.text, fontWeight: name === themeName ? '700' : '600', fontSize: 13 }}>
                {name === themeName ? '✓ ' : ''}
                {THEME_LABELS[name]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <SecondaryButton title="Manage Subjects" onPress={() => router.push('/subjects')} />
      <SecondaryButton title="Change Password" onPress={() => router.push('/change-password')} />
      <SecondaryButton title="Delete Account" onPress={() => router.push('/delete-account')} />
      <SecondaryButton title="Log Out" onPress={() => signOut()} />
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
    gap: 2,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    flexWrap: 'wrap',
  },
  themeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeChip: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
});
