import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Banner, FormField, PrimaryButton, ScreenContainer, ScreenSubtitle, ScreenTitle } from '../components/ui';
import { supabase } from '../lib/supabase';
import { passwordIssue } from '../lib/validation';

// Reached only from app/auth-callback.tsx after it turns a password-reset
// email link into a real (recovery) session via setSession() -- that's the
// session this screen's updateUser() call runs under.
export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    const issue = passwordIssue(password);
    if (issue) {
      setError(issue);
      return;
    }
    setError(null);
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.replace('/dashboard');
  }

  return (
    <ScreenContainer>
      <ScreenTitle>Set a new password</ScreenTitle>
      <ScreenSubtitle>Choose a new password for your account.</ScreenSubtitle>

      {error ? <Banner kind="error">{error}</Banner> : null}

      <FormField label="New password" value={password} onChangeText={setPassword} secureTextEntry />
      <PrimaryButton title="Save new password" onPress={handleSave} loading={submitting} />
    </ScreenContainer>
  );
}
