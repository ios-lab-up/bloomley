import { useMutation, useQueryClient } from '@tanstack/react-query';

import { userApi } from '../api/user';
import { userKeys } from '../api/queryKeys';
import type { NotificationSettings } from '../model/types';

/** Optimistic: toggling a setting should feel instant. */
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApi.updateNotificationSettings,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: userKeys.notificationSettings() });
      const previous = queryClient.getQueryData<NotificationSettings>(
        userKeys.notificationSettings(),
      );
      if (previous) {
        queryClient.setQueryData<NotificationSettings>(userKeys.notificationSettings(), {
          ...previous,
          ...payload,
        });
      }
      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(userKeys.notificationSettings(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.notificationSettings() });
    },
  });
}
