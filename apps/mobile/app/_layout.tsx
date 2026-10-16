import '../global.css';

import { useAuth } from '@clerk/clerk-expo';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '@/app';
import { isClerkConfigured } from '@/shared/lib/clerk';

// Only rendered when ClerkProvider is mounted (useAuth throws otherwise).
function AuthStack() {
  const { isLoaded, isSignedIn } = useAuth();

  // Until Clerk restores the saved session we can't know if the user is
  // signed in; rendering now would briefly treat them as signed out and
  // bounce them away from /home.
  if (!isLoaded) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Reachable only while signed in. If `isSignedIn` flips to false
          (manual sign-out, or the 401 handler in AuthTokenBridge), Expo
          Router removes these screens from the history and sends the user
          to the anchor route (`index`), which redirects to onboarding. */}
      <Stack.Protected guard={!!isSignedIn}>
        <Stack.Screen name="home" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      {isClerkConfigured ? <AuthStack /> : <Stack screenOptions={{ headerShown: false }} />}
      <StatusBar style="auto" />
    </AppProviders>
  );
}
