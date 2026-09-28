import { useMutation, useQueryClient } from '@tanstack/react-query';

import { userApi } from '../api/user';
import { userKeys } from '../api/queryKeys';
import type { User } from '../model/types';

/** Optimistic: display-name edits are low-risk and latency-sensitive. */
export function useUpdateMe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApi.updateMe,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: userKeys.me() });
      const previous = queryClient.getQueryData<User>(userKeys.me());
      if (previous) {
        queryClient.setQueryData<User>(userKeys.me(), { ...previous, ...payload });
      }
      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(userKeys.me(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.me() });
    },
  });
}
