import { createContext, useMemo, useState, type PropsWithChildren } from 'react';

import { resolveFirstMission, type EnergyLevel, type Mission, type PillarId } from '@/entities/onboarding';

export type Intention = {
  presetIds: string[];
  customText: string;
};

export type OnboardingFlowValue = {
  selectedPillars: PillarId[];
  togglePillar: (pillarId: PillarId) => void;
  intention: Intention;
  toggleIntentionPreset: (presetId: string) => void;
  setIntentionCustomText: (text: string) => void;
  energyLevel: EnergyLevel | null;
  setEnergyLevel: (level: EnergyLevel) => void;
  firstMission: Mission | null;
};

export const OnboardingFlowContext = createContext<OnboardingFlowValue | null>(null);

export function OnboardingFlowProvider({ children }: PropsWithChildren) {
  const [selectedPillars, setSelectedPillars] = useState<PillarId[]>([]);
  const [intention, setIntention] = useState<Intention>({ presetIds: [], customText: '' });
  const [energyLevel, setEnergyLevelState] = useState<EnergyLevel | null>(null);

  const togglePillar = (pillarId: PillarId) => {
    setSelectedPillars((current) =>
      current.includes(pillarId)
        ? current.filter((id) => id !== pillarId)
        : [...current, pillarId],
    );
  };

  const toggleIntentionPreset = (presetId: string) => {
    setIntention((current) => ({
      ...current,
      presetIds: current.presetIds.includes(presetId)
        ? current.presetIds.filter((id) => id !== presetId)
        : [...current.presetIds, presetId],
    }));
  };

  const setIntentionCustomText = (customText: string) => {
    setIntention((current) => ({ ...current, customText }));
  };

  const setEnergyLevel = (level: EnergyLevel) => {
    setEnergyLevelState(level);
  };

  const firstMission = useMemo(() => {
    if (!energyLevel) return null;
    const pillarId = selectedPillars[0] ?? 'fisico';
    return resolveFirstMission(pillarId, energyLevel);
  }, [energyLevel, selectedPillars]);

  const value: OnboardingFlowValue = {
    selectedPillars,
    togglePillar,
    intention,
    toggleIntentionPreset,
    setIntentionCustomText,
    energyLevel,
    setEnergyLevel,
    firstMission,
  };

  return <OnboardingFlowContext.Provider value={value}>{children}</OnboardingFlowContext.Provider>;
}
