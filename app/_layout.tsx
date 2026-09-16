import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { ActiveSubjectProvider } from '../hooks/useActiveSubject';
import { SubjectsProvider } from '../hooks/useSubjects';
import { AuthProvider, useAuth } from '../lib/auth';

const PUBLIC_ROUTES = ['index', 'register', 'login', 'forgot-password'];
// auth-callback establishes the session itself (from a Supabase email link)
// and reset-password needs that just-established session to survive a
// render -- both manage their own navigation, so the guard below must leave
// them alone instead of racing them to /dashboard the instant session flips
// from null to set.
const GUARD_EXEMPT_ROUTES = ['auth-callback', 'reset-password'];

function RootNavigator() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { loading, session, profile, access } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const currentRoute = segments[0] ?? 'index';

  useEffect(() => {
    if (loading) return;
    if (GUARD_EXEMPT_ROUTES.includes(currentRoute)) return;
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
        <SubjectsProvider>
          <ActiveSubjectProvider>
            <RootNavigator />
          </ActiveSubjectProvider>
        </SubjectsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
