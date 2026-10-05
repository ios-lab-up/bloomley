import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '@/app';
import { OnboardingFlowProvider } from '@/features/onboarding-flow';

export default function RootLayout() {
  return (
    <AppProviders>
      {/* Above the whole router so the onboarding choices outlive the
          onboarding screens and can be saved once the user is signed in. */}
      <OnboardingFlowProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="auto" />
      </OnboardingFlowProvider>
    </AppProviders>
  );
}
