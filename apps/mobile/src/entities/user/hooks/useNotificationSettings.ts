import { useAuth } from '@clerk/clerk-expo';
import { useQuery } from '@tanstack/react-query';

import { userApi } from '../api/user';
import { userKeys } from '../api/queryKeys';

export function useNotificationSettings() {
  const { isSignedIn, userId } = useAuth();

  return useQuery({
    queryKey: userKeys.notificationSettings(userId ?? 'anonymous'),
    queryFn: userApi.notificationSettings,
    enabled: !!isSignedIn,
  });
}
