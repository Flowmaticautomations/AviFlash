import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { Banner, FormField, PrimaryButton, ScreenContainer, ScreenSubtitle, ScreenTitle } from '../components/ui';
import { useThemeColors } from '../hooks/useThemeColors';
import { supabase } from '../lib/supabase';
import { passwordIssue } from '../lib/validation';

// Uses the already-signed-in session directly (supabase.auth.updateUser) --
// no email/SMS link needed, unlike forgot-password's reset flow. Nothing
// here depends on the SMS-OTP feasibility work.
export default function ChangePassword() {
  const colors = useThemeColors();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

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
    setPassword('');
    setSaved(true);
  }

  return (
    <ScreenContainer>
      <ScreenTitle>Change Password</ScreenTitle>
      <ScreenSubtitle>Choose a new password for your account.</ScreenSubtitle>

      {error ? <Banner kind="error">{error}</Banner> : null}
      {saved ? <Banner kind="success">Your password has been changed.</Banner> : null}

      <FormField label="New password" value={password} onChangeText={setPassword} secureTextEntry />
      <PrimaryButton title="Save new password" onPress={handleSave} loading={submitting} />

      <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
        <Text style={{ color: colors.muted, textAlign: 'center' }}>Back to Settings</Text>
      </Pressable>
    </ScreenContainer>
  );
}
