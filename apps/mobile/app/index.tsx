import { useAuth } from '@clerk/clerk-expo';
import { Redirect } from 'expo-router';

import { isClerkConfigured } from '@/shared/lib/clerk';

export default function Index() {
  // Clerk isn't mounted at all when EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is
  // missing (see AppProviders) -- calling useAuth() outside ClerkProvider
  // throws, so that fallback must skip this branch entirely rather than
  // just check `isSignedIn`.
  if (!isClerkConfigured) {
    return <Redirect href="/onboarding/welcome" />;
  }
  return <AuthGatedIndex />;
}

function AuthGatedIndex() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return null;
  }

  return <Redirect href={isSignedIn ? '/home' : '/onboarding/welcome'} />;
}
