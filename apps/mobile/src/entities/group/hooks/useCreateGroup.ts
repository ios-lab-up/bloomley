import { useMutation, useQueryClient } from '@tanstack/react-query';

import { groupApi } from '../api/client';
import { groupKeys } from '../api/queryKeys';

/**
 * Not optimistic: the server generates `id`/`invite_code`, so there's
 * nothing sensible to render locally before the response comes back.
 */
export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: groupApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
    },
  });
}
