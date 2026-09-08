import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { AuthProvider, useAuth } from '../lib/auth';

const PUBLIC_ROUTES = ['index', 'register', 'login', 'forgot-password'];

function RootNavigator() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { loading, session, profile, access } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const currentRoute = segments[0] ?? 'index';

  useEffect(() => {
    if (loading) return;
    const inPublicRoute = PUBLIC_ROUTES.includes(currentRoute);

    if (!session) {
      if (!inPublicRoute) router.replace('/');
      return;
    }

    if (!profile?.profile_completed) {
      if (currentRoute !== 'profile-completion') router.replace('/profile-completion');
      return;
    }

    if (access === 'locked') {
      if (currentRoute !== 'paywall') router.replace('/paywall');
      return;
    }

    if (inPublicRoute || currentRoute === 'profile-completion' || currentRoute === 'paywall') {
      router.replace('/dashboard');
    }
  }, [loading, session, profile, access, currentRoute, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.tint} size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
