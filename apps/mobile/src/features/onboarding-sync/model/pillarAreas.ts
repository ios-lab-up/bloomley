import type { PillarId } from '@/entities/onboarding';

/**
 * Onboarding pillars are a coarse 3-way choice; the backend catalogue
 * (seeded in `c4d6e8f0a1b2_seed_wellness_catalog`) has five areas. Matched by
 * area name since the ids are generated server-side.
 */
export const areaNamesByPillar: Record<PillarId, string[]> = {
  fisico: ['Movimiento', 'Descanso', 'Nutrición'],
  mental: ['Mindfulness'],
  social: ['Conexión'],
};
