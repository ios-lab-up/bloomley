import { apiClient } from '@/entities/user';

import type { WellnessArea } from '../model/types';

export const wellnessAreaApi = {
  list: () => apiClient.get<WellnessArea[]>('/wellness-areas'),

  get: (id: string) => apiClient.get<WellnessArea>(`/wellness-areas/${id}`),

  mine: () => apiClient.get<WellnessArea[]>('/wellness-areas/me'),

  select: (id: string) => apiClient.post<WellnessArea>(`/wellness-areas/${id}/select`),

  deselect: (id: string) =>
    apiClient.delete<void>(`/wellness-areas/${id}/select`),
};