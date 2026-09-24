import { ClerkProvider } from '@clerk/clerk-expo';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/nunito';
import type { PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthTokenBridge } from './AuthTokenBridge';
import { tokenCache } from './tokenCache';

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

  if (!publishableKey) {
    return <SafeAreaProvider>{children}</SafeAreaProvider>;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider>
        <AuthTokenBridge />
        {children}
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
