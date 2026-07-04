import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuthContext } from '@/contexts/AuthContext';

// Inner component — rendered inside AuthProvider so it can read context
function RootLayoutInner() {
  const { isAuthenticated, loading } = useAuthContext();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) {
      console.log('[RootLayout] loading auth state...');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    console.log('[RootLayout] auth check -> isAuthenticated:', isAuthenticated, 'inAuthGroup:', inAuthGroup, 'segments:', segments);

    if (!isAuthenticated && !inAuthGroup) {
      console.log('[RootLayout] redirect -> /(auth)/login');
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      console.log('[RootLayout] redirect -> /(tabs)');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, loading, segments]);

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutInner />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
