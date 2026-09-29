import { useAuth } from '@clerk/clerk-expo';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { userApi } from '../api/user';
import { userKeys } from '../api/queryKeys';
import type { User } from '../model/types';

/** Optimistic: display-name edits are low-risk and latency-sensitive. */
export function useUpdateMe() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const meKey = userKeys.me(userId ?? 'anonymous');

  return useMutation({
    mutationFn: userApi.updateMe,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: meKey });
      const previous = queryClient.getQueryData<User>(meKey);
      if (previous) {
        queryClient.setQueryData<User>(meKey, { ...previous, ...payload });
      }
      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(meKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: meKey });
    },
  });
}
