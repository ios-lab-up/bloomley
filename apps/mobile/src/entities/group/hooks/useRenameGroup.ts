import { useMutation, useQueryClient } from '@tanstack/react-query';

import { groupApi } from '../api/client';
import { groupKeys } from '../api/queryKeys';

export function useRenameGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, name }: { groupId: string; name: string }) =>
      groupApi.rename(groupId, name),
    onSuccess: (_group, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
    },
  });
}
