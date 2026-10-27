import { useAuth } from '@clerk/clerk-expo';
import { useQuery } from '@tanstack/react-query';

import { isTransientError } from '../api/isTransientError';
import { userApi } from '../api/user';
import { userKeys } from '../api/queryKeys';

const TRANSIENT_RETRIES = 3;

export function useCurrentUser() {
  const { isSignedIn, userId } = useAuth();

  const query = useQuery({
    queryKey: userKeys.me(userId ?? 'anonymous'),
    queryFn: userApi.me,
    enabled: !!isSignedIn,
    // The API provisions the user on this first call, so there's no 401 to
    // wait out anymore (a 401 now means a dead session, handled in the
    // client). Retry only network blips and 5xx, then show the error state.
    retry: (failureCount, error) => isTransientError(error) && failureCount < TRANSIENT_RETRIES,
    retryDelay: 1000,
  });

  // While the query is disabled (signed out), it never leaves `pending` on
  // its own -- callers must check `isSignedIn` before trusting `isPending`.
  return { ...query, isSignedIn: !!isSignedIn };
}
