import { apiClient } from '@/entities/user';

import type { Checkin, CheckinInput } from '../model/types';

export const checkinApi = {
  create: (payload: CheckinInput) =>
    apiClient.post<Checkin>('/checkins', payload),

  listMine: (params: { limit?: number; offset?: number } = {}) => {
    const query: string[] = [];
    if (params.limit !== undefined) query.push(`limit=${params.limit}`);
    if (params.offset !== undefined) query.push(`offset=${params.offset}`);
    const qs = query.length > 0 ? `?${query.join('&')}` : '';
    return apiClient.get<Checkin[]>(`/checkins/me${qs}`);
  },
};