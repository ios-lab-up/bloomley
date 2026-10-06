import { useAuth } from '@clerk/clerk-expo';
import { Redirect } from 'expo-router';

import { SaveProgressScreen } from '@/screens/onboarding/save-progress';
import { isClerkConfigured } from '@/shared/lib/clerk';

export default function SaveProgressRoute() {
  if (!isClerkConfigured) {
    return <SaveProgressScreen />;
  }
  return <GatedSaveProgress />;
}

// A user who signed in with Google/Apple from "Ya tengo cuenta" but had no
// account lands in onboarding already signed in -- there's nothing left to
// save the progress to, so skip straight to the app.
function GatedSaveProgress() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect href="/" />;
  return <SaveProgressScreen />;
}
