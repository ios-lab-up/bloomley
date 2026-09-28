export const groupKeys = {
  all: ['groups'] as const,
  lists: () => [...groupKeys.all, 'list'] as const,
  detail: (groupId: string) => [...groupKeys.all, 'detail', groupId] as const,
  members: (groupId: string) => [...groupKeys.detail(groupId), 'members'] as const,
  streak: (groupId: string) => [...groupKeys.detail(groupId), 'streak'] as const,
};
