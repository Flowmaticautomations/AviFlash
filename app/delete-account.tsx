import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { Banner, ScreenContainer, ScreenSubtitle, ScreenTitle } from '../components/ui';
import { useThemeColors } from '../hooks/useThemeColors';

// Explanation-only, on purpose -- there's no backend deletion job or storage
// policy for this yet (retention window, what "delete" actually touches
// across profiles/decks/flashcards/card_images/storage objects), so this
// screen must not claim to submit or perform anything. Matches the existing
// paywall.tsx pattern for a manual, email-based process rather than an
// automated one. Do not wire this to an actual delete until that backend
// work is scoped and approved.
export default function DeleteAccount() {
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <ScreenContainer>
      <ScreenTitle>Delete Account</ScreenTitle>
      <ScreenSubtitle>Please read this before requesting deletion.</ScreenSubtitle>

      <Banner kind="info">
        Your account information is kept for 90 days after a deletion request, in case you change your mind or need
        it restored, before it is permanently deleted.
      </Banner>

      <Banner kind="info">
        Your phone number is retained beyond that window. This is to prevent the same person from repeatedly
        claiming a new free trial by creating another account.
      </Banner>

      <Text style={{ color: colors.text, marginTop: 8, lineHeight: 20 }}>
        To request deletion of your account, email demo@aviflash.co.za (temporary contact) from the email address
        on your account and our team will action it.
      </Text>

      <Pressable onPress={() => router.back()} style={{ marginTop: 24 }}>
        <Text style={{ color: colors.tint, textAlign: 'center', fontWeight: '600' }}>Back to Settings</Text>
      </Pressable>
    </ScreenContainer>
  );
}
