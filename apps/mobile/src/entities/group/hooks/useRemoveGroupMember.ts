import { useMutation, useQueryClient } from '@tanstack/react-query';

import { groupApi } from '../api/client';
import { groupKeys } from '../api/queryKeys';

export function useRemoveGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      groupApi.removeMember(groupId, userId),
    onSuccess: (_data, { groupId }) => {
      // detail(groupId) prefixes members(groupId), and holds member_count.
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
    },
  });
}
