import { apiClient } from '@/entities/user';

import type {
  BloomFeedback,
  Mission,
  MissionCompleteRequest,
  MissionCompletion,
} from '../model/types';

export const missionApi = {
  list: (params: { area_id?: string; mine?: boolean } = {}) => {
    const query: string[] = [];
    if (params.area_id) query.push(`area_id=${encodeURIComponent(params.area_id)}`);
    if (params.mine) query.push('mine=true');
    const qs = query.length > 0 ? `?${query.join('&')}` : '';
    return apiClient.get<Mission[]>(`/missions${qs}`);
  },

  get: (id: string) => apiClient.get<Mission>(`/missions/${id}`),

  complete: (id: string, payload: MissionCompleteRequest) =>
    apiClient.post<MissionCompletion>(`/missions/${id}/complete`, payload),

  listMyCompletions: (params: { limit?: number; offset?: number } = {}) =>
    apiClient.get<MissionCompletion[]>(
      `/missions/me/completions${toQueryString(params)}`,
    ),

  listMyFeedback: (params: { limit?: number; offset?: number } = {}) =>
    apiClient.get<BloomFeedback[]>(`/missions/me/feedback${toQueryString(params)}`),
};

function toQueryString(params: { limit?: number; offset?: number }): string {
  const query: string[] = [];
  if (params.limit !== undefined) query.push(`limit=${params.limit}`);
  if (params.offset !== undefined) query.push(`offset=${params.offset}`);
  return query.length > 0 ? `?${query.join('&')}` : '';
}