import { useAuth } from '@clerk/clerk-expo';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { userApi } from '../api/user';
import { userKeys } from '../api/queryKeys';
import type { NotificationSettings } from '../model/types';

/** Optimistic: toggling a setting should feel instant. */
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const settingsKey = userKeys.notificationSettings(userId ?? 'anonymous');

  return useMutation({
    mutationFn: userApi.updateNotificationSettings,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: settingsKey });
      const previous = queryClient.getQueryData<NotificationSettings>(settingsKey);
      if (previous) {
        queryClient.setQueryData<NotificationSettings>(settingsKey, {
          ...previous,
          ...payload,
        });
      }
      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(settingsKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: settingsKey });
    },
  });
}
