import { ClerkProvider } from '@clerk/clerk-expo';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/nunito';
import { QueryClientProvider } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import type { PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthTokenBridge } from './AuthTokenBridge';
import { queryClient } from './queryClient';
import { tokenCache } from './tokenCache';

// Lets the OAuth browser tab close itself and hand control back to the app
// once Clerk's hosted sign-in flow (useSSO) redirects back. Must run once,
// at import time, before any social sign-in button is pressed.
WebBrowser.maybeCompleteAuthSession();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  console.warn(
    'Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY -- copy apps/mobile/.env.example to .env and fill it in. Running without Clerk for now (no auth).',
  );
}

export function AppProviders({ children }: PropsWithChildren) {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_800ExtraBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {publishableKey ? (
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <SafeAreaProvider>
            <AuthTokenBridge />
            {children}
          </SafeAreaProvider>
        </ClerkProvider>
      ) : (
        <SafeAreaProvider>{children}</SafeAreaProvider>
      )}
    </QueryClientProvider>
  );
}
