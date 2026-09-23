import { ClerkProvider } from '@clerk/clerk-expo';
import type { ReactNode } from 'react';

import { AuthTokenBridge } from './AuthTokenBridge';
import { tokenCache } from './tokenCache';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function AppProviders({ children }: { children: ReactNode }) {
  if (!publishableKey) {
    throw new Error(
      'Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY -- copy apps/mobile/.env.example to .env and fill it in.',
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <AuthTokenBridge />
      {children}
    </ClerkProvider>
  );
}
