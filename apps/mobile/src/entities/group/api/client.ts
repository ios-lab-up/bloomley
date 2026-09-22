// Wraps GET /api/v1/groups/* using the shared apiClient from entities/user
// (Bearer token + base URL). Response bodies are snake_case from FastAPI;
// apiClient is expected to camelCase them the same way it does for
// entities/user — do not add ad-hoc parsing here if that changes.
//
// NOTE: `@/entities/user` doesn't exist in this branch yet (Max's module).
// This file is written against the interface documented in the parallel-work
// contract and won't resolve until that module lands.
import { apiClient } from '@/entities/user';

import type { Group, GroupDetail, GroupMember, GroupStreak } from '../model/types';

export function fetchMyGroups() {
  return apiClient.get<Group[]>('/api/v1/groups/me');
}

export function createGroup(name: string) {
  return apiClient.post<Group>('/api/v1/groups', { name });
}

export function joinGroup(inviteCode: string) {
  return apiClient.post<Group>('/api/v1/groups/join', { invite_code: inviteCode });
}

export function fetchGroup(groupId: string) {
  return apiClient.get<GroupDetail>(`/api/v1/groups/${groupId}`);
}

export function leaveGroup(groupId: string) {
  return apiClient.delete<void>(`/api/v1/groups/${groupId}/members/me`);
}

export function fetchGroupMembers(groupId: string) {
  return apiClient.get<GroupMember[]>(`/api/v1/groups/${groupId}/members`);
}

export function fetchGroupStreak(groupId: string) {
  return apiClient.get<GroupStreak>(`/api/v1/groups/${groupId}/streak`);
}
