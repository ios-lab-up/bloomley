import { useAuth } from '@clerk/clerk-expo';
import { Redirect } from 'expo-router';

import { useSyncOnboardingChoices } from '@/features/onboarding-sync';
import { ProfileScreen } from '@/screens/profile';
import { isClerkConfigured } from '@/shared/lib/clerk';

export default function Home() {
  // Same guard as app/index.tsx: without Clerk there is no ClerkProvider, so
  // useAuth() would throw -- send the user to onboarding instead.
  if (!isClerkConfigured) {
    return <Redirect href="/onboarding/welcome" />;
  }
  return <AuthGatedHome />;
}

function AuthGatedHome() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <Redirect href="/onboarding/welcome" />;
  }

  return <SignedInHome />;
}

function SignedInHome() {
  useSyncOnboardingChoices();
  return <ProfileScreen />;
}
