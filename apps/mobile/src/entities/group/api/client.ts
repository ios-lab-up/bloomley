import { apiClient } from '@/entities/user';

import type { Group, GroupDetail, GroupMember, GroupStreak } from '../model/types';

export const groupApi = {
  myGroups: () => apiClient.get<Group[]>('/groups/me'),

  create: (name: string) => apiClient.post<Group>('/groups', { name }),

  join: (invite_code: string) => apiClient.post<Group>('/groups/join', { invite_code }),

  get: (groupId: string) => apiClient.get<GroupDetail>(`/groups/${groupId}`),

  leave: (groupId: string) => apiClient.delete<void>(`/groups/${groupId}/members/me`),

  members: (groupId: string) => apiClient.get<GroupMember[]>(`/groups/${groupId}/members`),

  streak: (groupId: string) => apiClient.get<GroupStreak>(`/groups/${groupId}/streak`),
};
