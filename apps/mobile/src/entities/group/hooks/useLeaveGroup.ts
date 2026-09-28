import { useMutation, useQueryClient } from '@tanstack/react-query';

import { groupApi } from '../api/client';
import { groupKeys } from '../api/queryKeys';
import type { Group } from '../model/types';

/** Optimistic: removes the group from the cached list immediately. */
export function useLeaveGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => groupApi.leave(groupId),
    onMutate: async (groupId) => {
      await queryClient.cancelQueries({ queryKey: groupKeys.lists() });
      const previous = queryClient.getQueryData<Group[]>(groupKeys.lists());
      if (previous) {
        queryClient.setQueryData<Group[]>(
          groupKeys.lists(),
          previous.filter((group) => group.id !== groupId),
        );
      }
      return { previous };
    },
    onError: (_err, _groupId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(groupKeys.lists(), context.previous);
      }
    },
    onSettled: (_data, _err, groupId) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
      queryClient.removeQueries({ queryKey: groupKeys.detail(groupId) });
    },
  });
}
