import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinkText, PrimaryButton, ScreenContainer } from '../components/ui';
import { getRandomQuote } from '../constants/quotes';
import { useThemeColors } from '../hooks/useThemeColors';

export default function Welcome() {
  const colors = useThemeColors();
  const router = useRouter();
  const quote = useMemo(() => getRandomQuote(), []);

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: colors.text }]}>Welcome to AviFlash</Text>
        <Text style={[styles.tagline, { color: colors.muted }]}>
          The smart study companion designed to help you learn, revise and achieve your best.
        </Text>
        <Text style={[styles.quote, { color: colors.tint }]}>&ldquo;{quote}&rdquo;</Text>
        <View style={[styles.trialPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.trialText, { color: colors.tint }]}>7-day free trial, no card required to start</Text>
        </View>
        <PrimaryButton title="Start your 7-day free trial" onPress={() => router.push('/register')} />
        <LinkText onPress={() => router.push('/login')}>Already have an account? Log in</LinkText>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 24,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  tagline: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
  },
  quote: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  trialPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  trialText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
