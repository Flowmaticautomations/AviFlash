import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Banner, LinkText, ScreenContainer, ScreenSubtitle, ScreenTitle } from '../components/ui';
import { useThemeColors } from '../hooks/useThemeColors';
import { supabase } from '../lib/supabase';

// Supabase's email-confirmation and password-reset links redirect here (see
// lib/authRedirect.ts) carrying access_token/refresh_token/type in the URL
// *fragment* -- not the query string, so expo-router's useLocalSearchParams
// can't see them. Read the raw incoming URL via Linking instead.
function parseFragmentParams(url: string): Record<string, string> {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return {};
  return Object.fromEntries(new URLSearchParams(url.slice(hashIndex + 1)));
}

export default function AuthCallback() {
  const router = useRouter();
  const colors = useThemeColors();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function handle(url: string | null) {
      if (!url || cancelled) return;
      const params = parseFragmentParams(url);

      if (params.error) {
        setError(
          params.error_description
            ? params.error_description.replace(/\+/g, ' ')
            : 'This link is invalid or has expired.'
        );
        return;
      }

      if (!params.access_token || !params.refresh_token) return;

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (cancelled) return;
      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      router.replace(params.type === 'recovery' ? '/reset-password' : '/login');
    }

    Linking.getInitialURL().then(handle);
    const subscription = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [router]);

  return (
    <ScreenContainer>
      <ScreenTitle>One moment…</ScreenTitle>
      {error ? (
        <>
          <Banner kind="error">{error}</Banner>
          <ScreenSubtitle>
            Request a fresh link and try again — links expire after a while and can only be used once.
          </ScreenSubtitle>
          <LinkText onPress={() => router.replace('/login')}>Back to login</LinkText>
        </>
      ) : (
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <ActivityIndicator color={colors.tint} size="large" />
        </View>
      )}
    </ScreenContainer>
  );
}
