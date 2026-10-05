import { useAuth } from '@clerk/clerk-expo';
import { useQuery } from '@tanstack/react-query';

import { ApiError } from '../api/client';
import { userApi } from '../api/user';
import { userKeys } from '../api/queryKeys';

const USER_PROVISIONING_RETRIES = 10;

export function useCurrentUser() {
  const { isSignedIn, userId } = useAuth();

  const query = useQuery({
    queryKey: userKeys.me(userId ?? 'anonymous'),
    queryFn: userApi.me,
    enabled: !!isSignedIn,
    // Right after sign-up the backend hasn't created the user yet (webhook
    // `user.created`), so /users/me answers 401 for a few seconds. Retry
    // that case every second for ~10 s before surfacing an error.
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status === 401 && failureCount < USER_PROVISIONING_RETRIES,
    retryDelay: 1000,
  });

  // While the query is disabled (signed out), it never leaves `pending` on
  // its own -- callers must check `isSignedIn` before trusting `isPending`.
  return { ...query, isSignedIn: !!isSignedIn };
}
