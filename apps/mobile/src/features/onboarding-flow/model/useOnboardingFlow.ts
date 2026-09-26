import { useContext } from 'react';

import { OnboardingFlowContext } from './OnboardingFlowContext';

export function useOnboardingFlow() {
  const context = useContext(OnboardingFlowContext);
  if (!context) {
    throw new Error('useOnboardingFlow must be used within an OnboardingFlowProvider');
  }
  return context;
}
