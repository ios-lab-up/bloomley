import { apiClient } from '@/entities/user';

import type { WellnessArea } from '../model/types';

export const wellnessAreaApi = {
  list: () => apiClient.get<WellnessArea[]>('/wellness-areas'),

  mine: () => apiClient.get<WellnessArea[]>('/wellness-areas/me'),

  select: (id: string) => apiClient.post<WellnessArea>(`/wellness-areas/${id}/select`),
};
