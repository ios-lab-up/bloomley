import { bloomImages } from '@/shared/assets/bloom';

import type { EnergyOption } from './types';

export const energyOptions: EnergyOption[] = [
  {
    id: 'low',
    title: 'Poca energía',
    description: 'Misión de 5 minutos. Con eso basta.',
    image: bloomImages.sleep,
  },
  {
    id: 'normal',
    title: 'Normal',
    description: 'Misión de 10 minutos. El ritmo de siempre.',
    image: bloomImages.tea,
  },
  {
    id: 'high',
    title: 'Con todo',
    description: 'Misión de 20 minutos. Bloom te sigue.',
    image: bloomImages.cheer,
  },
];
