import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Banner, FormField, LinkText, PrimaryButton, ScreenContainer, ScreenSubtitle, ScreenTitle } from '../components/ui';
import { AUTH_REDIRECT_URL } from '../lib/authRedirect';
import { supabase } from '../lib/supabase';
import { isValidEmail } from '../lib/validation';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSend() {
    setError(null);
    setSent(false);
    if (!email.trim() || !isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: AUTH_REDIRECT_URL,
    });
    setSubmitting(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  return (
    <ScreenContainer>
      <ScreenTitle>Reset your password</ScreenTitle>
      <ScreenSubtitle>Enter your account email and we&apos;ll send you a reset link.</ScreenSubtitle>

      {error ? <Banner kind="error">{error}</Banner> : null}
      {sent ? (
        <Banner kind="success">
          If an account exists for that email, a reset link is on its way — check your inbox.
        </Banner>
      ) : null}

      <FormField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <PrimaryButton title="Send reset email" onPress={handleSend} loading={submitting} />
      <LinkText onPress={() => router.push('/login')}>Back to login</LinkText>
    </ScreenContainer>
  );
}
