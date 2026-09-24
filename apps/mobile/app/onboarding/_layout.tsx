import { Stack } from 'expo-router';

import { OnboardingFlowProvider } from '@/features/onboarding-flow';

export default function OnboardingLayout() {
  return (
    <OnboardingFlowProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingFlowProvider>
  );
}
