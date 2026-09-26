import type { ImageSourcePropType } from 'react-native';

export type PillarId = 'fisico' | 'mental' | 'social';

export type Pillar = {
  id: PillarId;
  title: string;
  description: string;
  dotColorClassName: string;
};

export type IntentionOption = {
  id: string;
  pillarId: PillarId;
  label: string;
};

export type EnergyLevel = 'low' | 'normal' | 'high';

export type EnergyOption = {
  id: EnergyLevel;
  title: string;
  description: string;
  image: ImageSourcePropType;
};

export type Mission = {
  title: string;
  description: string;
  pillarId: PillarId;
  durationMinutes: number;
  xp: number;
};
