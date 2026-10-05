import { apiClient } from '@/entities/user';

import type { Streak } from '../model/types';

export const streakApi = {
  mine: () => apiClient.get<Streak>('/streaks/me'),
};