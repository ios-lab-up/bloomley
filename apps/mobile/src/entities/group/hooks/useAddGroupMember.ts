import { useMutation, useQueryClient } from '@tanstack/react-query';

import { groupApi } from '../api/client';
import { groupKeys } from '../api/queryKeys';

export function useAddGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, username }: { groupId: string; username: string }) =>
      groupApi.addMember(groupId, username),
    onSuccess: (_member, { groupId }) => {
      // detail(groupId) prefixes members(groupId), and holds member_count.
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
    },
  });
}
