import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useCurrentUser } from '@/entities/user';
import { wellnessAreaApi } from '@/entities/wellness-area';
import { useOnboardingFlow } from '@/features/onboarding-flow';

import { areaNamesByPillar } from './pillarAreas';

/**
 * Saves the pillars picked during onboarding to the user's account once the
 * backend user exists (i.e. `/users/me` resolved). Fire-and-forget: it never
 * blocks the UI and retries on its own with backoff, so a failure only means
 * the pillars stay unsaved for this session.
 *
 * Never overwrites: if the account already has areas (e.g. a returning user
 * signing in on a new device) or nothing was picked, it does nothing.
 */
export function useSyncOnboardingChoices() {
  const { data: user } = useCurrentUser();
  const { selectedPillars } = useOnboardingFlow();
  const hasRun = useRef(false);

  const { mutate } = useMutation({
    mutationFn: async (pillarIds: typeof selectedPillars) => {
      const existing = await wellnessAreaApi.mine();
      if (existing.length > 0) return;

      const catalogue = await wellnessAreaApi.list();
      const wantedNames = new Set(pillarIds.flatMap((id) => areaNamesByPillar[id]));
      const areaIds = catalogue.filter((area) => wantedNames.has(area.name)).map((a) => a.id);

      await Promise.all(areaIds.map((id) => wellnessAreaApi.select(id)));
    },
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });

  useEffect(() => {
    if (!user || hasRun.current || selectedPillars.length === 0) return;
    hasRun.current = true;
    mutate(selectedPillars);
  }, [user, selectedPillars, mutate]);
}
