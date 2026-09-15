import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from 'react-native';
import {
  Banner,
  FormField,
  LinkText,
  PrimaryButton,
  ScreenContainer,
  ScreenSubtitle,
  ScreenTitle,
  SecondaryButton,
} from '../components/ui';
import { getRandomQuote } from '../constants/quotes';
import { useThemeColors } from '../hooks/useThemeColors';
import { supabase } from '../lib/supabase';
import { isValidEmail } from '../lib/validation';

// No Google OAuth dependency is installed yet (Phase 3 scope is email/password
// only) — flip this once expo-auth-session + the Google provider are wired up
// in Phase 3's Google sign-in follow-up.
const GOOGLE_SIGN_IN_AVAILABLE = false;

export default function Login() {
  const router = useRouter();
  const colors = useThemeColors();
  const quote = useMemo(() => getRandomQuote(), []);
  const { justRegistered } = useLocalSearchParams<{ justRegistered?: string }>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const next: Record<string, string> = {};
    if (!email.trim()) next.email = 'Email is required.';
    else if (!isValidEmail(email)) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Password is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleLogin() {
    setBanner(null);
    if (!validate()) return;

    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);
    if (error) {
      setBanner(error.message);
      return;
    }
    // Session change is picked up by AuthProvider/root layout, which routes
    // to profile-completion, paywall, or dashboard as appropriate.
  }

  return (
    <ScreenContainer>
      <ScreenTitle>Welcome back</ScreenTitle>
      <ScreenSubtitle>{`“${quote}”`}</ScreenSubtitle>

      {justRegistered ? (
        <Banner kind="success">
          Check your email to confirm your account, then log in to finish setting up your profile.
        </Banner>
      ) : null}
      {banner ? <Banner kind="error">{banner}</Banner> : null}

      <FormField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <FormField
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
      />

      <PrimaryButton title="Log in" onPress={handleLogin} loading={submitting} />
      <LinkText onPress={() => router.push('/forgot-password')}>Forgot password?</LinkText>

      <SecondaryButton
        title={GOOGLE_SIGN_IN_AVAILABLE ? 'Continue with Google' : 'Google sign-in — coming soon'}
        onPress={() => {}}
        disabled={!GOOGLE_SIGN_IN_AVAILABLE}
      />

      <Text style={{ textAlign: 'center', marginTop: 16, color: colors.muted }}>
        Don&apos;t have an account?{' '}
      </Text>
      <LinkText onPress={() => router.push('/register')}>Start your 7-day free trial</LinkText>
    </ScreenContainer>
  );
}
